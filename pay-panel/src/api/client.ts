const API_BASE = ((import.meta as any).env?.VITE_API_BASE as string) || 'http://localhost:4000/api/v1'

const ACCESS_KEY = 'zee9-pay-access'
const REFRESH_KEY = 'zee9-pay-refresh'

export function getAccess() {
  return sessionStorage.getItem(ACCESS_KEY) || localStorage.getItem(ACCESS_KEY)
}

export function setTokens(access: string, refresh?: string) {
  sessionStorage.setItem(ACCESS_KEY, access)
  localStorage.setItem(ACCESS_KEY, access)
  if (refresh) {
    sessionStorage.setItem(REFRESH_KEY, refresh)
    localStorage.setItem(REFRESH_KEY, refresh)
  }
}

export function clearTokens() {
  sessionStorage.removeItem(ACCESS_KEY)
  sessionStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

/** Pull tokens from ?t=&r= query (handoff from game app) and strip them from the URL. */
export function absorbAuthFromUrl() {
  const url = new URL(window.location.href)
  const t = url.searchParams.get('t')
  const r = url.searchParams.get('r')
  if (t) {
    setTokens(t, r || undefined)
    url.searchParams.delete('t')
    url.searchParams.delete('r')
    window.history.replaceState({}, '', url.pathname + url.search + url.hash)
  }
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
  }

  const text = await res.text()
  let json: any = {}
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    throw new ApiError(res.status, 'PARSE_ERROR', 'Invalid server response')
  }
  if (!res.ok || json.ok === false) {
    const err = json.error || { code: 'ERROR', message: res.statusText }
    throw new ApiError(res.status, err.code, err.message)
  }
  return json.data
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = sessionStorage.getItem(REFRESH_KEY) || localStorage.getItem(REFRESH_KEY)
  if (!refreshToken) return false
  try {
    const res = await fetch(API_BASE + '/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    const json = await res.json()
    if (!res.ok || !json.ok) return false
    setTokens(json.data.accessToken, json.data.refreshToken)
    return true
  } catch {
    return false
  }
}

export const api = {
  get: (path: string) => raw(path, { method: 'GET' }),
  post: (path: string, body?: unknown) =>
    raw(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: (path: string, body?: unknown) =>
    raw(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
}

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
  if (!res.ok || !json.ok) {
    throw new ApiError(res.status, json.error?.code || 'ERROR', json.error?.message || 'Upload failed')
  }
  return json.data
}

export function gameHomeUrl() {
  const base = ((import.meta as any).env?.VITE_GAME_URL as string) || 'https://zee9.roadmaster.pro'
  return base.replace(/\/$/, '') + '/home'
}
