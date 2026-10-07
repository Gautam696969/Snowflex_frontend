import { readToken } from './auth-api'

export interface ChatContact {
  id: number
  fullName: string
  email: string
  role: string
  avatarUrl: string | null
  status: string
  isOnline: boolean
  lastSeen: string | null
}

export interface ChatMessageItem {
  id: number
  conversationId: number
  senderId: number
  body: string
  createdAt: string
  deliveredAt: string | null
  readAt: string | null
  clientMessageId: string | null
  isDeleted: boolean
  isPending?: boolean
}

export interface ChatConversationItem {
  id: number
  userAId: number
  userBId: number
  createdAt: string
  lastMessageAt: string
  otherUser: {
    id: number
    fullName: string
    email: string
    role: string
    avatarUrl: string | null
    status: string
    isOnline: boolean
    lastSeen: string | null
  }
  lastMessage: ChatMessageItem | null
  unreadCount: number
  isReadOnly: boolean
}

export interface PaginatedMessages {
  messages: ChatMessageItem[]
  nextCursor: number | null
  hasMore: boolean
}

interface ApiResponse<T> {
  success: boolean
  message?: string
  data: T
}

import { apiBase } from './api-config'

export function getSocketUrl(): string {
  const envUrl = (import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000').trim().replace(/\/+$/, '')
  return envUrl.replace(/\/api$/, '')
}

async function chatFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = readToken()
  if (!token) throw new Error('Not authenticated')

  const response = await fetch(`${apiBase}${path}`, {
    cache: 'no-store',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })

  const body = (await response.json().catch(() => null)) as ApiResponse<T> | null
  if (!response.ok || !body?.success) {
    throw new Error(body?.message || 'Chat service request failed')
  }

  return body.data
}

export async function fetchContacts(): Promise<ChatContact[]> {
  return chatFetch<ChatContact[]>('/chat/contacts')
}

export async function fetchConversations(): Promise<ChatConversationItem[]> {
  return chatFetch<ChatConversationItem[]>('/chat/conversations')
}

export async function createConversation(participantId: number): Promise<ChatConversationItem> {
  return chatFetch<ChatConversationItem>('/chat/conversations', {
    method: 'POST',
    body: JSON.stringify({ participantId }),
  })
}

export async function fetchMessages(
  conversationId: number,
  cursor?: number,
  limit = 30
): Promise<PaginatedMessages> {
  const query = new URLSearchParams()
  if (cursor) query.set('cursor', String(cursor))
  if (limit) query.set('limit', String(limit))

  const qs = query.toString() ? `?${query.toString()}` : ''
  return chatFetch<PaginatedMessages>(`/chat/conversations/${conversationId}/messages${qs}`)
}

export async function markConversationAsRead(conversationId: number): Promise<{ readCount: number }> {
  return chatFetch<{ readCount: number }>(`/chat/conversations/${conversationId}/read`, {
    method: 'POST',
  })
}

export async function fetchUnreadCount(): Promise<number> {
  const res = await chatFetch<{ count: number }>('/chat/unread-count')
  return res.count || 0
}
