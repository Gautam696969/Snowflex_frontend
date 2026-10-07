export interface UserProfile {
  id: number
  fullName: string
  email: string
  role: string
  avatarUrl: string | null
  hasPassword: boolean
  employeeId: number | null
  employeeCode: string | null
  phone: string | null
  departmentId: number | null
  departmentName: string | null
  designation: string | null
  joiningDate: string | null
  status: string
  address: string | null
  dateOfBirth: string | null
  gender: string | null
  createdAt: string | null
}

export interface UpdateProfilePayload {
  fullName?: string
  phone?: string | null
  designation?: string | null
  address?: string | null
  dateOfBirth?: string | null
  gender?: string | null
  email?: string
  employeeCode?: string
  departmentId?: number | null
  status?: string
}

export interface ChangePasswordPayload {
  currentPassword?: string
  newPassword: string
}

interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
}

import { apiBase } from './api-config'

export async function getUserProfile(token: string): Promise<UserProfile> {
  const response = await fetch(`${apiBase}/users/me`, {
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  const json = (await response.json().catch(() => null)) as ApiResponse<UserProfile> | null
  if (!response.ok || !json?.success || !json.data) {
    throw new Error(json?.message || 'Failed to load profile.')
  }
  return json.data
}

export async function updateUserProfile(token: string, payload: UpdateProfilePayload): Promise<UserProfile> {
  const response = await fetch(`${apiBase}/users/me`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
  const json = (await response.json().catch(() => null)) as ApiResponse<UserProfile> | null
  if (!response.ok || !json?.success || !json.data) {
    throw new Error(json?.message || 'Failed to update profile.')
  }
  return json.data
}

export async function uploadAvatar(token: string, file: File): Promise<string> {
  const formData = new FormData()
  formData.append('avatar', file)

  const response = await fetch(`${apiBase}/users/me/avatar`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })
  const json = (await response.json().catch(() => null)) as ApiResponse<{ avatarUrl: string }> | null
  if (!response.ok || !json?.success || !json.data?.avatarUrl) {
    throw new Error(json?.message || 'Failed to upload avatar.')
  }
  return json.data.avatarUrl
}

export async function removeAvatar(token: string): Promise<void> {
  const response = await fetch(`${apiBase}/users/me/avatar`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  const json = (await response.json().catch(() => null)) as ApiResponse | null
  if (!response.ok || !json?.success) {
    throw new Error(json?.message || 'Failed to remove avatar.')
  }
}

export async function changePassword(token: string, payload: ChangePasswordPayload): Promise<void> {
  const response = await fetch(`${apiBase}/users/me/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
  const json = (await response.json().catch(() => null)) as ApiResponse | null
  if (!response.ok || !json?.success) {
    throw new Error(json?.message || 'Failed to change password.')
  }
}
