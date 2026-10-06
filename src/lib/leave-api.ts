import { readToken } from './auth-api'

export interface LeaveType {
  id: number
  name: string
  code: string
  description: string | null
  isPaid: boolean
  yearlyQuota: number | null
  requiresDocument: boolean
  isActive: boolean
  createdAt?: string
}

export interface LeaveBalance {
  id: number
  employeeId: number
  leaveTypeId: number
  leaveTypeName: string
  leaveTypeCode: string
  description: string | null
  isPaid: boolean
  requiresDocument: boolean
  year: number
  total: number
  used: number
  pending: number
  remaining: number
  isUnlimited: boolean
}

export interface LeaveRecord {
  id: number
  employeeId: number
  requesterUserId?: number
  fullName?: string
  email?: string
  avatarUrl?: string | null
  leaveTypeId: number
  leaveType: string
  leaveTypeName?: string
  leaveTypeCode?: string
  isPaid?: boolean
  startDate: string
  endDate: string
  totalDays: number
  daysCount?: number
  halfDaySession?: 'FIRST_HALF' | 'SECOND_HALF' | null
  documentUrl?: string | null
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  approvedBy?: number | null
  approvedAt?: string | null
  approverName?: string | null
  decidedAt?: string | null
  decisionNote?: string | null
  autoApproved?: boolean | null
  rejectionReason?: string | null
  createdAt: string
  quotaTotal?: number
  quotaUsed?: number
  quotaPending?: number
  remainingBalance?: number
}

export interface ApplyLeavePayload {
  leaveTypeId: number
  startDate: string
  endDate: string
  reason: string
  halfDaySession?: 'FIRST_HALF' | 'SECOND_HALF' | null
  documentUrl?: string | null
}

export interface CreateLeaveTypePayload {
  name: string
  code: string
  description?: string
  isPaid?: boolean
  yearlyQuota?: number | null
  requiresDocument?: boolean
  isActive?: boolean
}

interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
  error?: string | null
}

export interface ApiError extends Error {
  status?: number
  currentStatus?: string
  isConflict?: boolean
}

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

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

  const json = await res.json().catch(() => ({ success: false, message: 'Invalid server response' })) as ApiResponse<T> & { currentStatus?: string }
  if (!res.ok || !json.success) {
    const error = new Error(json.error || json.message || 'Operation failed') as ApiError
    error.status = res.status
    error.currentStatus = json.currentStatus
    error.isConflict = res.status === 409 || /already decided|not pending/i.test(error.message)
    throw error
  }

  return json.data as T
}

export async function fetchLeaveTypes(activeOnly = true): Promise<LeaveType[]> {
  return authFetch<LeaveType[]>(`/leave-types?activeOnly=${activeOnly}`)
}

export async function createLeaveType(payload: CreateLeaveTypePayload): Promise<LeaveType> {
  return authFetch<LeaveType>('/leave-types', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateLeaveType(id: number, payload: Partial<CreateLeaveTypePayload>): Promise<LeaveType> {
  return authFetch<LeaveType>(`/leave-types/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function toggleLeaveType(id: number, isActive: boolean): Promise<LeaveType> {
  return authFetch<LeaveType>(`/leave-types/${id}/toggle`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  })
}

export async function deleteLeaveType(id: number): Promise<void> {
  return authFetch<void>(`/leave-types/${id}`, {
    method: 'DELETE',
  })
}

export async function fetchMyLeaveBalances(year?: number): Promise<LeaveBalance[]> {
  const query = year ? `?year=${year}` : ''
  return authFetch<LeaveBalance[]>(`/leave-balances/me${query}`)
}

export async function fetchEmployeeLeaveBalances(employeeId: number, year?: number): Promise<LeaveBalance[]> {
  const query = year ? `?year=${year}` : ''
  return authFetch<LeaveBalance[]>(`/leave-balances/employee/${employeeId}${query}`)
}

export async function applyLeave(payload: ApplyLeavePayload): Promise<{ id: number; daysCount: number }> {
  return authFetch<{ id: number; daysCount: number }>('/leaves', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function fetchMyLeaves(): Promise<LeaveRecord[]> {
  return authFetch<LeaveRecord[]>('/leaves/me')
}

export async function fetchAllLeaves(scope: 'team' | 'admin' = 'team'): Promise<LeaveRecord[]> {
  return authFetch<LeaveRecord[]>(`/leaves?scope=${scope}`)
}

export async function fetchLeaveActionCount(): Promise<number> {
  const result = await authFetch<{ count: number }>('/leaves/badge-count')
  return result.count
}

export async function approveLeave(id: number): Promise<LeaveRecord> {
  return authFetch<LeaveRecord>(`/leaves/${id}/approve`, {
    method: 'PATCH',
  })
}

export async function rejectLeave(id: number, reason?: string): Promise<LeaveRecord> {
  return authFetch<LeaveRecord>(`/leaves/${id}/reject`, {
    method: 'PATCH',
    body: JSON.stringify(reason ? { reason } : {}),
  })
}

export async function cancelLeave(id: number): Promise<LeaveRecord | void> {
  return authFetch<LeaveRecord | void>(`/leaves/${id}/cancel`, {
    method: 'PATCH',
  })
}

// Working days calculation helper for client-side instant feedback
export function calculateWorkingDaysClient(startDate: string, endDate: string, isHalfDay = false): number {
  if (!startDate || !endDate) return 0
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0
  if (isHalfDay) return 0.5

  let workingDays = 0
  const cur = new Date(start)
  while (cur <= end) {
    const day = cur.getDay()
    if (day !== 0 && day !== 6) {
      workingDays++
    }
    cur.setDate(cur.getDate() + 1)
  }
  return workingDays
}
