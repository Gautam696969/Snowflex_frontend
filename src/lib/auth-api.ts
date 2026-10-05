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
    cache: 'no-store',
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

export function forgotPassword(email: string): Promise<ApiResponse> {
  return request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) })
}

export function resetPassword(input: { token: string; password: string }): Promise<ApiResponse> {
  return request('/auth/reset-password', { method: 'POST', body: JSON.stringify(input) })
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
  const response = await request<ApiResponse & { data: Record<string, unknown> }>(`/dashboard/${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const d = response.data || {}
  return {
    totalEmployees: Number(d.totalEmployees ?? d.TOTAL_EMPLOYEES ?? 0),
    activeEmployees: Number(d.activeEmployees ?? d.ACTIVE_EMPLOYEES ?? 0),
    presentToday: Number(d.presentToday ?? d.PRESENT_TODAY ?? 0),
    absentToday: Number(d.absentToday ?? d.ABSENT_TODAY ?? 0),
    lateToday: Number(d.lateToday ?? d.LATE_TODAY ?? 0),
    pendingLeaves: Number(d.pendingLeaves ?? d.PENDING_LEAVES ?? 0),
    pendingTasks: Number(d.pendingTasks ?? d.PENDING_TASKS ?? 0),
    teamSize: Number(d.teamSize ?? d.TEAM_SIZE ?? 0),
    teamPresentToday: Number(d.teamPresentToday ?? d.TEAM_PRESENT_TODAY ?? 0),
    teamAbsentToday: Number(d.teamAbsentToday ?? d.TEAM_ABSENT_TODAY ?? 0),
    pendingLeaveRequests: Number(d.pendingLeaveRequests ?? d.PENDING_LEAVE_REQUESTS ?? 0),
    attendanceThisMonth: Number(d.attendanceThisMonth ?? d.ATTENDANCE_THIS_MONTH ?? 0),
    leaveBalance: Number(d.leaveBalance ?? d.LEAVE_BALANCE ?? 0),
    assignedTasks: Number(d.assignedTasks ?? d.ASSIGNED_TASKS ?? 0),
    completedTasks: Number(d.completedTasks ?? d.COMPLETED_TASKS ?? 0),
  }
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

export async function getUsers(token: string): Promise<SafeUser[]> {
  const response = await request<ApiResponse & { data: SafeUser[] }>('/admin/users', {
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
  id: number | string
  conversationId: number
  role: 'user' | 'assistant'
  content: string
  model?: string
  createdAt: string
  status?: 'sending' | 'sent' | 'error'
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
  payload: { source: 'ai-employee'; conversationId?: number; message: string },
): Promise<AiChatResponse> {
  return apiRequest<AiChatResponse>('/ai-employee/chat', token, 'POST', payload)
}

export interface AiWidgetMessage {
  id: string
  role: 'assistant'
  content: string
  model: string
  createdAt: string
}

export async function sendWidgetMessage(
  token: string,
  payload: {
    source: 'widget'
    message: string
    history: Array<{ role: 'user' | 'assistant'; content: string }>
  },
): Promise<{ message: AiWidgetMessage }> {
  return apiRequest<{ message: AiWidgetMessage }>('/ai-employee/widget/chat', token, 'POST', payload)
}

export async function transcribeVoiceAudio(token: string, blob: Blob, language?: string, mimeType?: string): Promise<string> {
  const form = new FormData()
  const extension = (mimeType || blob.type).includes('mp4') ? 'mp4' : 'webm'
  form.append('audio', blob, `audio.${extension}`)
  if (language) form.append('language', language.split('-')[0])
  const response = await fetch(`${apiBase}/voice/transcribe`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  const body = (await response.json().catch(() => null)) as ApiResponse & { text?: string; data?: { text?: string } } | null
  if (!response.ok || !body?.success) {
    throw new Error(body?.message || 'Transcription failed.')
  }
  return body.text ?? body.data?.text ?? ''
}
