export interface SafeUser {
  id: number
  fullName: string
  email: string
  role: string
}

interface ApiResponse {
  success: boolean
  message?: string
}

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const tokenKey = 'snowflex.auth.token'

async function request<T extends ApiResponse>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  const body = (await response.json().catch(() => null)) as T | null
  if (!response.ok || !body?.success) {
    throw new Error(body?.message || 'Unable to reach the authentication service.')
  }
  return body
}

export function register(input: { fullName: string; email: string; password: string }): Promise<ApiResponse> {
  return request('/auth/register', { method: 'POST', body: JSON.stringify(input) })
}

export function login(input: { email: string; password: string }): Promise<ApiResponse & { token: string; user: SafeUser }> {
  return request('/auth/login', { method: 'POST', body: JSON.stringify(input) })
}

export async function getCurrentUser(token: string): Promise<SafeUser> {
  const response = await request<ApiResponse & { user: SafeUser }>('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.user
}

export async function logout(token: string): Promise<void> {
  await request('/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
}

export function storeToken(token: string, remember: boolean): void {
  clearToken()
  ;(remember ? localStorage : sessionStorage).setItem(tokenKey, token)
}

export function readToken(): string | null {
  return sessionStorage.getItem(tokenKey) || localStorage.getItem(tokenKey)
}

export function clearToken(): void {
  sessionStorage.removeItem(tokenKey)
  localStorage.removeItem(tokenKey)
}
