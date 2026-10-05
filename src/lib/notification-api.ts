export interface NotificationItem {
  id: number
  userId: number
  type: string
  title: string
  message: string
  link: string | null
  relatedId: number | null
  isRead: boolean
  createdAt: string
  readAt: string | null
}

export interface UnreadCounts {
  total: number
  byType: Record<string, number>
}

interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
}

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export async function fetchNotifications(
  token: string,
  options: { page?: number; limit?: number } = {},
): Promise<{ items: NotificationItem[]; total: number; page: number; limit: number }> {
  const page = options.page || 1
  const limit = options.limit || 20
  const response = await fetch(`${apiBase}/notifications?page=${page}&limit=${limit}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  const json = (await response.json().catch(() => null)) as ApiResponse<{
    items: NotificationItem[]
    total: number
    page: number
    limit: number
  }> | null

  if (!response.ok || !json?.success || !json.data) {
    throw new Error(json?.message || 'Failed to fetch notifications.')
  }
  return json.data
}

export async function fetchUnreadCounts(token: string): Promise<UnreadCounts> {
  const response = await fetch(`${apiBase}/notifications/unread-count`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  const json = (await response.json().catch(() => null)) as ApiResponse<UnreadCounts> | null

  if (!response.ok || !json?.success || !json.data) {
    throw new Error(json?.message || 'Failed to fetch unread notification counts.')
  }
  return json.data
}

export async function markNotificationRead(token: string, id: number): Promise<void> {
  const response = await fetch(`${apiBase}/notifications/${id}/read`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  const json = (await response.json().catch(() => null)) as ApiResponse | null
  if (!response.ok || !json?.success) {
    throw new Error(json?.message || 'Failed to mark notification as read.')
  }
}

export async function markAllNotificationsRead(token: string): Promise<void> {
  const response = await fetch(`${apiBase}/notifications/read-all`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  const json = (await response.json().catch(() => null)) as ApiResponse | null
  if (!response.ok || !json?.success) {
    throw new Error(json?.message || 'Failed to mark all notifications as read.')
  }
}

export async function markNotificationsByTypeRead(token: string, type: string): Promise<void> {
  const response = await fetch(`${apiBase}/notifications/read-by-type`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ type }),
  })
  const json = (await response.json().catch(() => null)) as ApiResponse | null
  if (!response.ok || !json?.success) {
    throw new Error(json?.message || `Failed to mark '${type}' notifications as read.`)
  }
}

export function createNotificationStream(
  token: string,
  callbacks: {
    onNotification?: (item: NotificationItem, counts?: UnreadCounts) => void
    onCountsUpdate?: (counts: UnreadCounts) => void
    onError?: (err: Event) => void
  },
): () => void {
  // Use query token so EventSource works natively in all browsers
  const streamUrl = `${apiBase}/notifications/stream?token=${encodeURIComponent(token)}`
  const eventSource = new EventSource(streamUrl)

  eventSource.addEventListener('notification', (e) => {
    try {
      const data = JSON.parse(e.data) as { notification: NotificationItem; unreadCounts?: UnreadCounts }
      if (data.notification && callbacks.onNotification) {
        callbacks.onNotification(data.notification, data.unreadCounts)
      }
    } catch {
      // ignore parse error
    }
  })

  eventSource.addEventListener('unread_counts', (e) => {
    try {
      const data = JSON.parse(e.data) as UnreadCounts
      if (callbacks.onCountsUpdate) {
        callbacks.onCountsUpdate(data)
      }
    } catch {
      // ignore parse error
    }
  })

  eventSource.onerror = (err) => {
    if (callbacks.onError) callbacks.onError(err)
  }

  return () => {
    eventSource.close()
  }
}
