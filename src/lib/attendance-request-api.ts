import { readToken } from './auth-api'
import { apiBase } from './api-config'

export type AttendanceRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface AttendanceRequestItem {
  id: number
  employeeId: number
  userId?: number
  employeeName?: string
  employeeEmail?: string
  employeeAvatarUrl?: string | null
  employeeCode?: string
  departmentName?: string
  date: string
  attendanceDate: string
  type: string
  requestType: string
  checkInTime: string | null
  checkOutTime: string | null
  reason: string
  status: AttendanceRequestStatus
  decidedBy: number | null
  decidedByName: string | null
  decidedByRole: string | null
  decidedAt: string | null
  rejectReason: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateAttendanceRequestInput {
  date: string
  type: string
  checkInTime?: string | null
  checkOutTime?: string | null
  reason: string
}

export interface PaginatedAttendanceRequests {
  items: AttendanceRequestItem[]
  total: number
  page: number
  limit: number
}

export interface ApiError extends Error {
  status?: number
  isConflict?: boolean
}

interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
  error?: string | null
}

async function authFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = readToken()
  if (!token) throw new Error('Authentication required')

  const headers = new Headers(options.headers || {})
  headers.set('Authorization', `Bearer ${token}`)
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(`${apiBase}${endpoint}`, {
    ...options,
    cache: 'no-store',
    headers,
  })

  const json = (await res.json().catch(() => ({
    success: false,
    message: 'Invalid server response',
  }))) as ApiResponse<T>

  if (!res.ok || !json.success) {
    const error = new Error(json.error || json.message || 'Operation failed') as ApiError
    error.status = res.status
    error.isConflict = res.status === 409 || /already handled|already decided|not pending/i.test(error.message)
    throw error
  }

  return json.data as T
}

export async function fetchAttendanceRequests(
  status?: string,
  page?: number,
  limit?: number
): Promise<{ items: AttendanceRequestItem[]; total?: number }> {
  const params = new URLSearchParams()
  if (status && status !== 'ALL') params.set('status', status)
  if (page) params.set('page', String(page))
  if (limit) params.set('limit', String(limit))

  const qs = params.toString() ? `?${params.toString()}` : ''
  const result = await authFetch<PaginatedAttendanceRequests | AttendanceRequestItem[]>(`/attendance-requests${qs}`)

  if (Array.isArray(result)) {
    return { items: result, total: result.length }
  }
  if (result && Array.isArray(result.items)) {
    return { items: result.items, total: result.total }
  }
  return { items: [], total: 0 }
}

export async function fetchPendingAttendanceCount(): Promise<number> {
  try {
    const res = await authFetch<{ pendingCount: number }>('/attendance-requests/badge-count')
    return res.pendingCount ?? 0
  } catch {
    return 0
  }
}

export async function createAttendanceRequest(
  payload: CreateAttendanceRequestInput
): Promise<AttendanceRequestItem> {
  return authFetch<AttendanceRequestItem>('/attendance-requests', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function approveAttendanceRequest(id: number): Promise<AttendanceRequestItem> {
  return authFetch<AttendanceRequestItem>(`/attendance-requests/${id}/approve`, {
    method: 'PATCH',
  })
}

export async function rejectAttendanceRequest(
  id: number,
  reason?: string | null
): Promise<AttendanceRequestItem> {
  return authFetch<AttendanceRequestItem>(`/attendance-requests/${id}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ reason: reason || null }),
  })
}
