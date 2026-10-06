import { useEffect, useState } from 'react'
import { getAvatarBackground, getFullAvatarUrl, getInitials } from '../lib/avatar'

interface UserAvatarProps {
  name: string
  avatarUrl?: string | null
  size?: number | string
  className?: string
}

export default function UserAvatar({ name, avatarUrl, size = 34, className = '' }: UserAvatarProps) {
  const accessibleName = name.trim() || 'User'
  const imageUrl = getFullAvatarUrl(avatarUrl)
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => setImageFailed(false), [imageUrl])

  const dimension = typeof size === 'number' ? `${size}px` : size
  return (
    <span
      className={`user-avatar ${className}`.trim()}
      style={{ width: dimension, height: dimension, backgroundColor: getAvatarBackground(accessibleName) }}
      role="img"
      aria-label={accessibleName}
    >
      {imageUrl && !imageFailed ? (
        <img
          src={imageUrl}
          alt={`${accessibleName}'s profile picture`}
          className="user-avatar-image"
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className="user-avatar-initials" aria-hidden="true">{getInitials(accessibleName)}</span>
      )}
    </span>
  )
}