const API_BASE = ((import.meta as any).env?.VITE_API_BASE as string) || 'http://localhost:4000/api/v1'

const ACCESS_KEY = 'zee9-player-access'
const REFRESH_KEY = 'zee9-player-refresh'

export function getAccess() {
  return localStorage.getItem(ACCESS_KEY)
}
export function setTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_KEY, access)
  localStorage.setItem(REFRESH_KEY, refresh)
}
export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

export class ApiError extends Error {
  status: number
  code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

function parseApiBody(text: string, status: number): any {
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    if (status === 429 || /^too many/i.test(text)) {
      throw new ApiError(429, 'RATE_LIMITED', 'Too many requests, try later')
    }
    throw new ApiError(status, 'PARSE_ERROR', text.slice(0, 120) || 'Invalid server response')
  }
}

/** Single-flight refresh — parallel 401s must share one refresh call (token rotation). */
let refreshInFlight: Promise<boolean> | null = null

async function raw(path: string, opts: RequestInit, retry = true): Promise<any> {
  const access = getAccess()
  const res = await fetch(API_BASE + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(access ? { Authorization: `Bearer ${access}` } : {}),
      ...(opts.headers || {}),
    },
  })

  if (res.status === 401 && retry) {
    if (await tryRefresh()) return raw(path, opts, false)
    clearTokens()
    throw new ApiError(401, 'UNAUTHORIZED', 'Session expired — please sign in again')
  }

  const text = await res.text()
  const json = parseApiBody(text, res.status)
  if (!res.ok || json.ok === false) {
    const err = json.error || { code: 'ERROR', message: res.statusText }
    throw new ApiError(res.status, err.code, err.message)
  }
  return json.data
}

async function tryRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight
  refreshInFlight = (async () => {
    const refreshToken = localStorage.getItem(REFRESH_KEY)
    if (!refreshToken) return false
    try {
      const res = await fetch(API_BASE + '/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      const text = await res.text()
      let json: any = {}
      try {
        json = text ? JSON.parse(text) : {}
      } catch {
        return false
      }
      if (!res.ok || !json.ok) return false
      setTokens(json.data.accessToken, json.data.refreshToken)
      return true
    } catch {
      return false
    } finally {
      refreshInFlight = null
    }
  })()
  return refreshInFlight
}

export const api = {
  get: (path: string) => raw(path, { method: 'GET' }),
  post: (path: string, body?: unknown) => raw(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: (path: string, body?: unknown) => raw(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
}

/** Multipart upload (deposit receipt) → returns the created media { id, url }. */
export async function uploadFile(file: File): Promise<{ id: string; url: string }> {
  const fd = new FormData()
  fd.append('file', file)
  const access = getAccess()
  const res = await fetch(API_BASE + '/uploads', {
    method: 'POST',
    headers: { ...(access ? { Authorization: `Bearer ${access}` } : {}) },
    body: fd,
  })
  const json = await res.json()
  if (!res.ok || !json.ok) throw new ApiError(res.status, json.error?.code || 'ERROR', json.error?.message || 'Upload failed')
  return json.data
}

export async function authRequest(kind: 'login' | 'register', body: Record<string, unknown>) {
  const res = await fetch(API_BASE + '/auth/' + kind, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let json: any = {}
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    if (res.status === 429 || /^too many/i.test(text)) {
      throw new ApiError(429, 'RATE_LIMITED', 'Too many login attempts. Please wait a few minutes and try again.')
    }
    throw new ApiError(res.status, 'PARSE_ERROR', text.slice(0, 120) || 'Invalid server response')
  }
  if (!res.ok || !json.ok) {
    throw new ApiError(res.status, json.error?.code || 'ERROR', json.error?.message || 'Request failed')
  }
  return json.data as {
    user: {
      id: string
      displayName: string
      role: string
      phone: string
      referralCode?: string
      playerNo?: number
    }
    accessToken: string
    refreshToken: string
  }
}
