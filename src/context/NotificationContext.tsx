import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react'
import { toast } from 'react-hot-toast'
import {
  fetchNotifications,
  fetchUnreadCounts,
  markNotificationRead,
  markAllNotificationsRead,
  markNotificationsByTypeRead,
  createNotificationStream,
  type NotificationItem,
  type UnreadCounts,
} from '../lib/notification-api'
import { readToken } from '../lib/auth-api'

interface NotificationContextValue {
  notifications: NotificationItem[]
  unreadCounts: UnreadCounts
  leaveUnreadCount: number
  loading: boolean
  refresh: () => Promise<void>
  markAsRead: (id: number) => Promise<void>
  markAllAsRead: () => Promise<void>
  markByTypeAsRead: (type: string) => Promise<void>
  clear: () => void
}

const defaultUnreadCounts: UnreadCounts = {
  total: 0,
  byType: {},
}

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCounts: defaultUnreadCounts,
  leaveUnreadCount: 0,
  loading: false,
  refresh: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  markByTypeAsRead: async () => {},
  clear: () => {},
})

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>(defaultUnreadCounts)
  const [loading, setLoading] = useState(false)
  const [authToken, setAuthToken] = useState<string | null>(() => readToken())

  // Listen to auth state changes (login, logout)
  useEffect(() => {
    const handleAuthChange = () => {
      const current = readToken()
      setAuthToken(current)
      if (!current) {
        setNotifications([])
        setUnreadCounts(defaultUnreadCounts)
      }
    }

    window.addEventListener('auth-token-changed', handleAuthChange)
    window.addEventListener('storage', handleAuthChange)
    return () => {
      window.removeEventListener('auth-token-changed', handleAuthChange)
      window.removeEventListener('storage', handleAuthChange)
    }
  }, [])

  // Calculate unread count specifically for leave requests (works for both Admin and Employee)
  const leaveUnreadCount = useMemo(() => {
    return Object.entries(unreadCounts.byType)
      .filter(([k]) => k.toUpperCase().startsWith('LEAVE'))
      .reduce((sum, [, count]) => sum + (count || 0), 0)
  }, [unreadCounts.byType])

  const clear = useCallback(() => {
    setNotifications([])
    setUnreadCounts(defaultUnreadCounts)
  }, [])

  const refresh = useCallback(async () => {
    const token = readToken()
    if (!token) return

    try {
      const [listResult, countsResult] = await Promise.all([
        fetchNotifications(token, { limit: 20 }),
        fetchUnreadCounts(token),
      ])
      setNotifications(listResult.items)
      setUnreadCounts(countsResult)
    } catch {
      // ignore background refresh errors
    }
  }, [])

  // Stream subscription & background polling tied to active authToken
  useEffect(() => {
    if (!authToken) {
      setNotifications([])
      setUnreadCounts(defaultUnreadCounts)
      return
    }

    setLoading(true)
    Promise.all([
      fetchNotifications(authToken, { limit: 20 }),
      fetchUnreadCounts(authToken),
    ])
      .then(([listResult, countsResult]) => {
        setNotifications(listResult.items)
        setUnreadCounts(countsResult)
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    // Subscribe to real-time Server-Sent Events stream
    const unsubscribeStream = createNotificationStream(authToken, {
      onNotification: (newNotification, updatedCounts) => {
        setNotifications((prev) => {
          if (prev.some((item) => item.id === newNotification.id)) return prev
          return [newNotification, ...prev]
        })

        if (updatedCounts) {
          setUnreadCounts(updatedCounts)
        } else {
          setUnreadCounts((prev) => ({
            total: prev.total + 1,
            byType: {
              ...prev.byType,
              [newNotification.type]: (prev.byType[newNotification.type] || 0) + 1,
            },
          }))
        }

        // Show toast alert for the new notification
        toast(newNotification.message, {
          icon: '🔔',
          duration: 4500,
          style: {
            background: '#193c33',
            color: '#ffffff',
            border: '1px solid #10b981',
            fontSize: '13px',
            fontWeight: 500,
          },
        })
      },
      onCountsUpdate: (updatedCounts) => {
        setUnreadCounts(updatedCounts)
      },
    })

    // Fallback polling every 20 seconds, pausing when tab is hidden
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'hidden') return
      const currentToken = readToken()
      if (!currentToken) return

      fetchUnreadCounts(currentToken)
        .then((counts) => setUnreadCounts(counts))
        .catch(() => {})
    }, 20000)

    // Immediate check on tab focus
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const currentToken = readToken()
        if (currentToken) {
          fetchUnreadCounts(currentToken).then(setUnreadCounts).catch(() => {})
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      unsubscribeStream()
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [authToken])

  // Optimistic mark single notification as read
  const markAsRead = useCallback(async (id: number) => {
    const token = readToken()
    if (!token) return

    let itemType = ''
    setNotifications((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          itemType = item.type
          return { ...item, isRead: true, readAt: new Date().toISOString() }
        }
        return item
      }),
    )

    setUnreadCounts((prev) => {
      if (prev.total <= 0) return prev
      const newByType = { ...prev.byType }
      if (itemType && newByType[itemType]) {
        newByType[itemType] = Math.max(0, newByType[itemType] - 1)
      }
      return {
        total: Math.max(0, prev.total - 1),
        byType: newByType,
      }
    })

    try {
      await markNotificationRead(token, id)
    } catch {
      // rollback or re-sync if failed
      void refresh()
    }
  }, [refresh])

  // Optimistic mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    const token = readToken()
    if (!token) return

    setNotifications((prev) =>
      prev.map((item) => ({ ...item, isRead: true, readAt: new Date().toISOString() })),
    )
    setUnreadCounts(defaultUnreadCounts)

    try {
      await markAllNotificationsRead(token)
    } catch {
      void refresh()
    }
  }, [refresh])

  // Optimistic mark by type as read (e.g. 'LEAVE' when opening Leave requests view)
  const markByTypeAsRead = useCallback(async (type: string) => {
    const token = readToken()
    if (!token) return

    const prefix = type.trim().toUpperCase()
    let clearedCount = 0

    setNotifications((prev) =>
      prev.map((item) => {
        if (item.type.toUpperCase().startsWith(prefix) && !item.isRead) {
          clearedCount++
          return { ...item, isRead: true, readAt: new Date().toISOString() }
        }
        return item
      }),
    )

    setUnreadCounts((prev) => {
      const newByType = { ...prev.byType }
      let removedFromType = 0
      for (const [k, v] of Object.entries(newByType)) {
        if (k.toUpperCase().startsWith(prefix)) {
          removedFromType += v
          delete newByType[k]
        }
      }
      return {
        total: Math.max(0, prev.total - (clearedCount || removedFromType)),
        byType: newByType,
      }
    })

    try {
      await markNotificationsByTypeRead(token, type)
    } catch {
      void refresh()
    }
  }, [refresh])

  const contextValue = useMemo<NotificationContextValue>(() => ({
    notifications,
    unreadCounts,
    leaveUnreadCount,
    loading,
    refresh,
    markAsRead,
    markAllAsRead,
    markByTypeAsRead,
    clear,
  }), [
    notifications,
    unreadCounts,
    leaveUnreadCount,
    loading,
    refresh,
    markAsRead,
    markAllAsRead,
    markByTypeAsRead,
    clear,
  ])

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationContext)
}
