import { useCallback, useEffect, useState } from 'react'
import {
  getUserProfile,
  updateUserProfile,
  uploadAvatar,
  removeAvatar,
  type UserProfile,
  type UpdateProfilePayload,
} from '../lib/profile-api'

export function useProfile(token: string | null) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    if (!token) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await getUserProfile(token)
      setProfile(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load user profile.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void fetchProfile()
  }, [fetchProfile])

  const update = async (payload: UpdateProfilePayload): Promise<UserProfile> => {
    if (!token) throw new Error('Not authenticated')
    const updated = await updateUserProfile(token, payload)
    setProfile(updated)
    return updated
  }

  const uploadPhoto = async (file: File): Promise<string> => {
    if (!token) throw new Error('Not authenticated')
    const newAvatarUrl = await uploadAvatar(token, file)
    setProfile((prev) => (prev ? { ...prev, avatarUrl: newAvatarUrl } : null))
    return newAvatarUrl
  }

  const removePhoto = async (): Promise<void> => {
    if (!token) throw new Error('Not authenticated')
    await removeAvatar(token)
    setProfile((prev) => (prev ? { ...prev, avatarUrl: null } : null))
  }

  return {
    profile,
    loading,
    error,
    refresh: fetchProfile,
    update,
    uploadPhoto,
    removePhoto,
    setProfile,
  }
}
