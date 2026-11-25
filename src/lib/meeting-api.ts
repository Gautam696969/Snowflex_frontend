import { apiBase } from './api-config'
import { readToken } from './auth-api'

export type MeetingStatus = 'SCHEDULED' | 'LIVE' | 'ENDED' | 'MISSED'
export type MeetingParticipantRole = 'HOST' | 'PARTICIPANT'

export interface MeetingRecord {
  id: number
  meetingCode: string
  title: string
  description: string
  hostId: number
  hostName: string
  chatId: number | null
  invitedUserIds: number[]
  status: MeetingStatus
  allowScreenShare: boolean
  reminderSent: boolean
  scheduledAt: string | null
  startedAt: string | null
  endedAt: string | null
  joinLink: string
  createdAt: string
  activeParticipantCount: number
}

export interface MeetingParticipantRecord {
  userId: number
  fullName: string
  role: MeetingParticipantRole
  joinedAt: string | null
  leftAt: string | null
  isRemoved: boolean
}

export interface MeetingJoinResponse {
  meeting: MeetingRecord
  role: MeetingParticipantRole
  token: string | null
  livekitUrl: string | null
  iceServers: RTCIceServer[]
}

interface ApiResponse<T> {
  success: boolean
  message?: string
  data: T
}

async function meetingFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = readToken()
  if (!token) throw new Error('Not authenticated')

  const res = await fetch(`${apiBase}${path}`, {
    cache: 'no-store',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })

  const body = (await res.json().catch(() => null)) as ApiResponse<T> | null
  if (!res.ok || !body?.success) {
    throw new Error(body?.message || 'Meeting request failed')
  }
  return body.data
}

export async function createMeetingApi(payload: {
  title: string
  description?: string
  chatId?: number | null
  invitedUserIds?: number[]
  scheduledAt?: string | null
}): Promise<MeetingRecord> {
  return meetingFetch<MeetingRecord>('/meetings', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function listMeetingsApi(filter: 'upcoming' | 'past' | 'all' = 'all'): Promise<MeetingRecord[]> {
  return meetingFetch<MeetingRecord[]>(`/meetings?filter=${filter}`)
}

export async function getMeetingApi(code: string): Promise<{
  meeting: MeetingRecord
  participants: MeetingParticipantRecord[]
}> {
  return meetingFetch<{ meeting: MeetingRecord; participants: MeetingParticipantRecord[] }>(
    `/meetings/${encodeURIComponent(code)}`
  )
}

export async function joinMeetingApi(code: string): Promise<MeetingJoinResponse> {
  return meetingFetch<MeetingJoinResponse>(`/meetings/${encodeURIComponent(code)}/join`, {
    method: 'POST',
  })
}

export async function leaveMeetingApi(code: string): Promise<{
  meeting: MeetingRecord
  transferredHostToUserId: number | null
}> {
  return meetingFetch<{ meeting: MeetingRecord; transferredHostToUserId: number | null }>(
    `/meetings/${encodeURIComponent(code)}/leave`,
    { method: 'POST' }
  )
}

export async function endMeetingApi(code: string): Promise<MeetingRecord> {
  return meetingFetch<MeetingRecord>(`/meetings/${encodeURIComponent(code)}/end`, {
    method: 'POST',
  })
}

