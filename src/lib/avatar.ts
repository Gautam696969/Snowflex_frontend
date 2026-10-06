export function getInitials(name: string): string {
  if (!name) return 'U'
  return (
    name
      .split(' ')
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U'
  )
}

export function getAvatarBackground(name: string): string {
  const colors = ['#2d6a4f', '#1b4332', '#40916c', '#52b788', '#386641', '#6a994e', '#a7c957']
  let hash = 0
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export function getFullAvatarUrl(url?: string | null): string | null {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url
  }
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
  const origin = apiBase.replace(/\/api\/?$/, '')
  return `${origin}${url.startsWith('/') ? '' : '/'}${url}`
}

export const AVATAR_UPDATED_EVENT = 'snowflex:avatar-updated'

export function notifyAvatarUpdated(avatarUrl: string | null): void {
  window.dispatchEvent(new CustomEvent(AVATAR_UPDATED_EVENT, { detail: { avatarUrl } }))
}
