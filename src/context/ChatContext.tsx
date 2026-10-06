import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef, type ReactNode } from 'react'
import { io, Socket } from 'socket.io-client'
import { toast } from 'react-hot-toast'
import { readToken, getCurrentUser, type SafeUser } from '../lib/auth-api'
import {
  fetchConversations,
  fetchUnreadCount,
  createConversation,
  markConversationAsRead as apiMarkRead,
  getSocketUrl,
  type ChatConversationItem,
  type ChatMessageItem,
} from '../lib/chat-api'

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'reconnecting'

interface ChatContextValue {
  socket: Socket | null
  connectionStatus: ConnectionStatus
  conversations: ChatConversationItem[]
  activeConversationId: number | null
  setActiveConversationId: (id: number | null) => void
  totalUnreadCount: number
  onlineUsers: Map<number, { isOnline: boolean; lastSeen: string | null }>
  typingUsers: Map<number, string> // conversationId -> userName typing
  loadingConversations: boolean
  sendMessage: (conversationId: number, recipientId: number, body: string) => Promise<ChatMessageItem>
  markAsRead: (conversationId: number, recipientId: number) => Promise<void>
  sendTypingStart: (conversationId: number, recipientId: number) => void
  sendTypingStop: (conversationId: number, recipientId: number) => void
  refreshConversations: () => Promise<void>
  openConversationWithUser: (participantId: number) => Promise<ChatConversationItem>
}

const ChatContext = createContext<ChatContextValue | null>(null)

export function ChatProvider({ children, currentUser: propsUser }: { children: ReactNode; currentUser?: SafeUser | null }) {
  const [currentUser, setCurrentUser] = useState<SafeUser | null>(propsUser ?? null)

  useEffect(() => {
    if (propsUser !== undefined) {
      setCurrentUser(propsUser)
      return
    }

    const handleFetchUser = () => {
      const token = readToken()
      if (token) {
        getCurrentUser(token).then(setCurrentUser).catch(() => setCurrentUser(null))
      } else {
        setCurrentUser(null)
      }
    }

    handleFetchUser()
    window.addEventListener('auth-token-changed', handleFetchUser)
    window.addEventListener('storage', handleFetchUser)
    return () => {
      window.removeEventListener('auth-token-changed', handleFetchUser)
      window.removeEventListener('storage', handleFetchUser)
    }
  }, [propsUser])

  const [socket, setSocket] = useState<Socket | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [conversations, setConversations] = useState<ChatConversationItem[]>([])
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null)
  const [totalUnreadCount, setTotalUnreadCount] = useState<number>(0)
  const [onlineUsers, setOnlineUsers] = useState<Map<number, { isOnline: boolean; lastSeen: string | null }>>(new Map())
  const [typingUsers, setTypingUsers] = useState<Map<number, string>>(new Map())
  const [loadingConversations, setLoadingConversations] = useState(false)

  const activeConvIdRef = useRef<number | null>(null)
  activeConvIdRef.current = activeConversationId

  const typingTimeoutRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  // Initial fetch for conversations and unread count
  const refreshConversations = useCallback(async () => {
    const token = readToken()
    if (!token) return

    try {
      const [convs, unread] = await Promise.all([
        fetchConversations().catch(() => []),
        fetchUnreadCount().catch(() => 0),
      ])
      setConversations(convs)
      setTotalUnreadCount(unread)

      // Seed presence map from conversations
      setOnlineUsers((prev) => {
        const next = new Map(prev)
        for (const c of convs) {
          next.set(c.otherUser.id, {
            isOnline: c.otherUser.isOnline,
            lastSeen: c.otherUser.lastSeen,
          })
        }
        return next
      })
    } catch {
      // background refresh error ignored
    }
  }, [])

  // Socket initialization
  useEffect(() => {
    const token = readToken()
    if (!token || !currentUser) {
      if (socket) {
        socket.disconnect()
        setSocket(null)
      }
      setConnectionStatus('disconnected')
      setConversations([])
      setTotalUnreadCount(0)
      return
    }

    setLoadingConversations(true)
    void refreshConversations().finally(() => setLoadingConversations(false))

    const socketUrl = getSocketUrl()
    const newSocket = io(socketUrl, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      transports: ['websocket', 'polling'],
    })

    setConnectionStatus('connecting')

    newSocket.on('connect', () => {
      setConnectionStatus('connected')
      void refreshConversations()
    })

    newSocket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect') {
        // the disconnection was initiated on the server, you need to reconnect manually
        newSocket.connect()
      }
      setConnectionStatus('disconnected')
    })

    newSocket.on('reconnecting', () => {
      setConnectionStatus('reconnecting')
    })

    newSocket.on('connect_error', () => {
      setConnectionStatus('disconnected')
    })

    // Listen to incoming real-time message
    newSocket.on('message:new', (message: ChatMessageItem) => {
      const isMine = message.senderId === currentUser.id

      setConversations((prev) => {
        const convIndex = prev.findIndex((c) => c.id === message.conversationId)
        if (convIndex === -1) {
          // If conversation isn't in list yet, reload list
          void refreshConversations()
          return prev
        }

        const currentConv = prev[convIndex]
        const isActive = activeConvIdRef.current === message.conversationId
        const newUnread = !isMine && !isActive ? currentConv.unreadCount + 1 : currentConv.unreadCount

        const updatedConv: ChatConversationItem = {
          ...currentConv,
          lastMessage: message,
          lastMessageAt: message.createdAt,
          unreadCount: newUnread,
        }

        const remaining = prev.filter((_, idx) => idx !== convIndex)
        return [updatedConv, ...remaining]
      })

      if (!isMine) {
        const isActive = activeConvIdRef.current === message.conversationId
        if (!isActive) {
          setTotalUnreadCount((count) => count + 1)

          // Show polite toast when not on that conversation
          toast(
            `💬 ${message.body.length > 50 ? message.body.slice(0, 50) + '...' : message.body}`,
            {
              id: `chat-msg-${message.id}`,
              duration: 4000,
              style: {
                background: '#193c33',
                color: '#ffffff',
                border: '1px solid #d9ed74',
                fontSize: '13px',
                fontWeight: 500,
              },
            }
          )
        } else {
          // If active conversation, automatically acknowledge delivery and mark as read
          newSocket.emit('message:read', {
            conversationId: message.conversationId,
            recipientId: message.senderId,
          })
        }
      }
    })

    // Listen to read receipts
    newSocket.on('message:read', ({ conversationId, readerId, readAt }: { conversationId: number; readerId: number; readAt: string }) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === conversationId) {
            let updatedLastMsg = c.lastMessage
            if (updatedLastMsg && updatedLastMsg.senderId !== readerId) {
              updatedLastMsg = { ...updatedLastMsg, readAt, deliveredAt: updatedLastMsg.deliveredAt || readAt }
            }
            return {
              ...c,
              lastMessage: updatedLastMsg,
            }
          }
          return c
        })
      )
    })

    // Listen to delivered receipts
    newSocket.on('message:delivered', ({ messageId, conversationId, deliveredAt }: { messageId: number; conversationId: number; deliveredAt: string }) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === conversationId && c.lastMessage && c.lastMessage.id === messageId) {
            return {
              ...c,
              lastMessage: {
                ...c.lastMessage,
                deliveredAt: c.lastMessage.deliveredAt || deliveredAt,
              },
            }
          }
          return c
        })
      )
    })

    // Listen to presence updates
    newSocket.on('presence:update', ({ userId, isOnline, lastSeen }: { userId: number; isOnline: boolean; lastSeen?: string }) => {
      setOnlineUsers((prev) => {
        const next = new Map(prev)
        next.set(userId, { isOnline, lastSeen: lastSeen || null })
        return next
      })

      setConversations((prev) =>
        prev.map((c) => {
          if (c.otherUser.id === userId) {
            return {
              ...c,
              otherUser: {
                ...c.otherUser,
                isOnline,
                lastSeen: lastSeen || c.otherUser.lastSeen,
              },
            }
          }
          return c
        })
      )
    })

    // Listen to typing indicators
    newSocket.on('typing:start', ({ conversationId, userName }: { conversationId: number; userId: number; userName: string }) => {
      setTypingUsers((prev) => {
        const next = new Map(prev)
        next.set(conversationId, userName)
        return next
      })

      // Auto-clear typing after 4 seconds
      const existing = typingTimeoutRef.current.get(conversationId)
      if (existing) clearTimeout(existing)

      const timer = setTimeout(() => {
        setTypingUsers((prev) => {
          const next = new Map(prev)
          next.delete(conversationId)
          return next
        })
      }, 4000)

      typingTimeoutRef.current.set(conversationId, timer)
    })

    newSocket.on('typing:stop', ({ conversationId }: { conversationId: number }) => {
      setTypingUsers((prev) => {
        const next = new Map(prev)
        next.delete(conversationId)
        return next
      })
      const existing = typingTimeoutRef.current.get(conversationId)
      if (existing) clearTimeout(existing)
    })

    setSocket(newSocket)

    // Listen to logout or token change
    const handleAuthChange = () => {
      const currentToken = readToken()
      if (!currentToken) {
        newSocket.disconnect()
        setSocket(null)
        setConversations([])
        setTotalUnreadCount(0)
        setConnectionStatus('disconnected')
      }
    }

    window.addEventListener('auth-token-changed', handleAuthChange)
    window.addEventListener('storage', handleAuthChange)

    return () => {
      newSocket.disconnect()
      window.removeEventListener('auth-token-changed', handleAuthChange)
      window.removeEventListener('storage', handleAuthChange)
    }
  }, [currentUser?.id, refreshConversations])

  // Send message helper
  const sendMessage = useCallback(
    async (conversationId: number, recipientId: number, body: string): Promise<ChatMessageItem> => {
      if (!socket || connectionStatus !== 'connected') {
        throw new Error('Not connected to live chat server')
      }

      const clientMessageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

      return new Promise<ChatMessageItem>((resolve, reject) => {
        socket.emit(
          'message:send',
          { conversationId, recipientId, body, clientMessageId },
          (response: { success: boolean; message?: ChatMessageItem; error?: string }) => {
            if (response && response.success && response.message) {
              resolve(response.message)
            } else {
              reject(new Error(response?.error || 'Failed to send message'))
            }
          }
        )
      })
    },
    [socket, connectionStatus]
  )

  // Mark conversation as read helper
  const markAsRead = useCallback(
    async (conversationId: number, recipientId: number) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === conversationId && c.unreadCount > 0) {
            setTotalUnreadCount((tot) => Math.max(0, tot - c.unreadCount))
            return { ...c, unreadCount: 0 }
          }
          return c
        })
      )

      if (socket && connectionStatus === 'connected') {
        socket.emit('message:read', { conversationId, recipientId })
      }

      try {
        await apiMarkRead(conversationId)
      } catch {
        // background sync error ignored
      }
    },
    [socket, connectionStatus]
  )

  // Typing indicators
  const sendTypingStart = useCallback(
    (conversationId: number, recipientId: number) => {
      if (socket && connectionStatus === 'connected') {
        socket.emit('typing:start', { conversationId, recipientId })
      }
    },
    [socket, connectionStatus]
  )

  const sendTypingStop = useCallback(
    (conversationId: number, recipientId: number) => {
      if (socket && connectionStatus === 'connected') {
        socket.emit('typing:stop', { conversationId, recipientId })
      }
    },
    [socket, connectionStatus]
  )

  // Start or open conversation with a user
  const openConversationWithUser = useCallback(
    async (participantId: number): Promise<ChatConversationItem> => {
      const conv = await createConversation(participantId)
      setConversations((prev) => {
        const exists = prev.find((c) => c.id === conv.id)
        if (exists) return prev
        return [conv, ...prev]
      })
      setActiveConversationId(conv.id)
      return conv
    },
    []
  )

  const value = useMemo<ChatContextValue>(
    () => ({
      socket,
      connectionStatus,
      conversations,
      activeConversationId,
      setActiveConversationId,
      totalUnreadCount,
      onlineUsers,
      typingUsers,
      loadingConversations,
      sendMessage,
      markAsRead,
      sendTypingStart,
      sendTypingStop,
      refreshConversations,
      openConversationWithUser,
    }),
    [
      socket,
      connectionStatus,
      conversations,
      activeConversationId,
      totalUnreadCount,
      onlineUsers,
      typingUsers,
      loadingConversations,
      sendMessage,
      markAsRead,
      sendTypingStart,
      sendTypingStop,
      refreshConversations,
      openConversationWithUser,
    ]
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChat(): ChatContextValue {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}
