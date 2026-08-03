const API_BASE = ((import.meta as any).env?.VITE_API_BASE as string) || 'http://localhost:4000/api/v1'

const ACCESS_KEY = 'zee9-mentor-access'
const REFRESH_KEY = 'zee9-mentor-refresh'

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

async function raw(path: string, opts: RequestInit, retry = true): Promise<any> {
  const access = getAccess()
  const res = await fetch(API_BASE + path, {
    ...opts,
    cache: 'no-store',
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
  const refreshToken = localStorage.getItem(REFRESH_KEY)
  if (!refreshToken) return false
  try {
    const res = await fetch(API_BASE + '/auth/refresh', {
      method: 'POST',
      cache: 'no-store',
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
}

export async function loginRequest(phone: string, password: string) {
  const res = await fetch(API_BASE + '/auth/login', {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password, app: 'mentor' }),
  })
  const json = await res.json()
  if (!res.ok || !json.ok) throw new ApiError(res.status, json.error?.code || 'ERROR', json.error?.message || 'Login failed')
  return json.data as { user: { id: string; displayName: string; role: string }; accessToken: string; refreshToken: string }
}
