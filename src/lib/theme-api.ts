import { apiBase } from './api-config'

export interface UserTheme {
  id?: number
  userId: number
  mode?: 'light' | 'dark' | null
  bgColor?: string | null
  primaryColor?: string | null
  accentColor?: string | null
  sidebarColor?: string | null
  cardColor?: string | null
  textColor?: string | null
  updatedBy?: number | null
  updatedAt?: string | null
}

export interface SetThemeInput {
  mode?: 'light' | 'dark' | null
  bgColor?: string | null
  primaryColor?: string | null
  accentColor?: string | null
  sidebarColor?: string | null
  cardColor?: string | null
  textColor?: string | null
}

export interface BulkSetThemeInput extends SetThemeInput {}

interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
}

async function request<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    cache: 'no-store',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })

  const body = (await response.json().catch(() => null)) as ApiResponse<T> | null
  if (!response.ok || !body?.success) {
    throw new Error(body?.message || `Request failed with status ${response.status}`)
  }
  return body.data as T
}

export async function getMyTheme(token: string): Promise<UserTheme | null> {
  return request<UserTheme | null>('/themes/me', token)
}

export async function getUserTheme(token: string, userId: number): Promise<UserTheme | null> {
  return request<UserTheme | null>(`/themes/${userId}`, token)
}

export async function setUserTheme(token: string, userId: number, input: SetThemeInput): Promise<UserTheme> {
  return request<UserTheme>(`/themes/${userId}`, token, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export async function resetUserTheme(token: string, userId: number): Promise<void> {
  await request<{ reset: boolean }>(`/themes/${userId}`, token, {
    method: 'DELETE',
  })
}

export async function bulkSetThemeByRole(
  token: string,
  role: string,
  input: BulkSetThemeInput,
): Promise<{ count: number; theme: UserTheme }> {
  return request<{ count: number; theme: UserTheme }>(`/themes/role/${role}`, token, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export async function setMyMode(token: string, mode: 'light' | 'dark'): Promise<UserTheme> {
  return request<UserTheme>('/themes/me/mode', token, {
    method: 'PUT',
    body: JSON.stringify({ mode }),
  })
}

