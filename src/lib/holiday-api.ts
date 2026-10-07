import { apiBase } from './api-config'
import { readToken } from './auth-api'

export type HolidayType = 'PUBLIC' | 'COMPANY' | 'OPTIONAL' | 'RESTRICTED'
export type HolidayStatus = 'ACTIVE' | 'CANCELLED'

export interface Holiday {
  id: number
  name: string
  description: string | null
  holidayDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  type: HolidayType
  color: string | null
  isRecurring: boolean
  status: HolidayStatus
  createdByName?: string | null
  updatedByName?: string | null
  createdAt?: string
  updatedAt?: string
  daysCount?: number
}

export interface CreateHolidayPayload {
  name: string
  description?: string | null
  holidayDate: string
  endDate?: string | null
  type: HolidayType
  color?: string | null
  isRecurring?: boolean
}

export interface UpdateHolidayPayload {
  name?: string
  description?: string | null
  holidayDate?: string
  endDate?: string | null
  type?: HolidayType
  color?: string | null
  isRecurring?: boolean
  status?: HolidayStatus
}

interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
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
    const errorMsg = json.error || json.message || 'Operation failed'
    const err = new Error(errorMsg) as Error & { status?: number }
    err.status = res.status
    throw err
  }

  return json.data
}

export async function fetchHolidays(params: {
  year?: number
  month?: number
  type?: string
  status?: string
  search?: string
} = {}): Promise<Holiday[]> {
  const searchParams = new URLSearchParams()
  if (params.year) searchParams.set('year', String(params.year))
  if (params.month) searchParams.set('month', String(params.month))
  if (params.type && params.type !== 'ALL') searchParams.set('type', params.type)
  if (params.status && params.status !== 'ALL') searchParams.set('status', params.status)
  if (params.search) searchParams.set('search', params.search)

  const query = searchParams.toString()
  return authFetch<Holiday[]>(`/holidays${query ? `?${query}` : ''}`)
}

export async function fetchUpcomingHolidays(limit = 5): Promise<Holiday[]> {
  return authFetch<Holiday[]>(`/holidays/upcoming?limit=${limit}`)
}

export async function fetchHolidayById(id: number): Promise<Holiday> {
  return authFetch<Holiday>(`/holidays/${id}`)
}

export async function createHoliday(payload: CreateHolidayPayload): Promise<Holiday> {
  return authFetch<Holiday>('/holidays', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateHoliday(id: number, payload: UpdateHolidayPayload): Promise<Holiday> {
  return authFetch<Holiday>(`/holidays/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteHoliday(id: number, hard = false): Promise<{ id: number; status: string }> {
  return authFetch<{ id: number; status: string }>(`/holidays/${id}${hard ? '?hard=true' : ''}`, {
    method: 'DELETE',
  })
}
