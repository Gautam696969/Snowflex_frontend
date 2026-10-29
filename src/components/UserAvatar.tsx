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
      className={`user-avatar inline-grid place-items-center overflow-hidden rounded-full shrink-0 align-middle text-white font-bold uppercase ${className}`.trim()}
      style={{ width: dimension, height: dimension, backgroundColor: getAvatarBackground(accessibleName) }}
      role="img"
      aria-label={accessibleName}
    >
      {imageUrl && !imageFailed ? (
        <img
          src={imageUrl}
          alt={`${accessibleName}'s profile picture`}
          className="user-avatar-image block w-full h-full rounded-[inherit] object-cover"
          loading="lazy"
          decoding="async"
          crossOrigin="anonymous"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className="user-avatar-initials grid w-full h-full place-items-center text-inherit font-inherit leading-none" aria-hidden="true">{getInitials(accessibleName)}</span>
      )}
    </span>
  )
}