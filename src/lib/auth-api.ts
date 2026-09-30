export interface SafeUser {
  id: number
  fullName: string
  email: string
  role: string
}

interface ApiResponse {
  success: boolean
  message?: string
  data?: unknown
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

export async function login(input: { email: string; password: string }): Promise<{ token: string; user: SafeUser }> {
  const response = await request<ApiResponse & { data: { token: string; user: SafeUser } }>('/auth/login', {
    method: 'POST', body: JSON.stringify(input),
  })
  return response.data
}

export async function getCurrentUser(token: string): Promise<SafeUser> {
  const response = await request<ApiResponse & { data: SafeUser }>('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
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

export interface DashboardData {
  totalEmployees?: number
  activeEmployees?: number
  presentToday?: number
  absentToday?: number
  lateToday?: number
  pendingLeaves?: number
  pendingTasks?: number
  teamSize?: number
  teamPresentToday?: number
  teamAbsentToday?: number
  pendingLeaveRequests?: number
  attendanceThisMonth?: number
  leaveBalance?: number
  assignedTasks?: number
  completedTasks?: number
}

export async function getDashboard(token: string, role: string): Promise<DashboardData> {
  const endpoint = role === 'ADMIN' ? 'admin' : role === 'HR' ? 'hr' : role === 'MANAGER' ? 'manager' : 'employee'
  const response = await request<ApiResponse & { data: DashboardData }>(`/dashboard/${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}

export async function getEmployees(token: string): Promise<Record<string, unknown>[]> {
  const response = await request<ApiResponse & { data: Record<string, unknown>[] }>('/employees', {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}

export async function getDepartments(token: string): Promise<Record<string, unknown>[]> {
  const response = await request<ApiResponse & { data: Record<string, unknown>[] }>('/departments', {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}

export async function apiRequest<T>(path: string, token: string, method = 'GET', input?: unknown): Promise<T> {
  const response = await request<ApiResponse & { data: T }>(path, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    ...(input === undefined ? {} : { body: JSON.stringify(input) }),
  })
  return response.data
}

export interface AiConversation {
  id: number
  userId: number
  title: string
  createdAt: string
  updatedAt: string
}

export interface AiMessage {
  id: number
  conversationId: number
  role: 'user' | 'assistant'
  content: string
  model?: string
  createdAt: string
}

export interface AiChatResponse {
  conversation: AiConversation
  message: AiMessage
}

export async function listAiConversations(token: string): Promise<AiConversation[]> {
  return apiRequest<AiConversation[]>('/ai-employee/conversations', token)
}

export async function createAiConversation(token: string, title?: string): Promise<AiConversation> {
  return apiRequest<AiConversation>('/ai-employee/conversations', token, 'POST', { title })
}

export async function listAiMessages(token: string, conversationId: number): Promise<AiMessage[]> {
  return apiRequest<AiMessage[]>(`/ai-employee/conversations/${conversationId}/messages`, token)
}

export async function deleteAiConversation(token: string, conversationId: number): Promise<void> {
  await apiRequest<null>(`/ai-employee/conversations/${conversationId}`, token, 'DELETE')
}

export async function sendAiMessage(
  token: string,
  payload: { conversationId?: number; message: string },
): Promise<AiChatResponse> {
  return apiRequest<AiChatResponse>('/ai-employee/chat', token, 'POST', payload)
}
