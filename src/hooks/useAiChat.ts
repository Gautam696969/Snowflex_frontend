import { useState } from 'react'
import { sendAiMessage } from '../lib/auth-api'

export interface ChatEntry {
  id: string | number
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  status?: 'sending' | 'sent' | 'failed'
}

interface FailedMessage {
  id: string
  content: string
}

export function useAiChat(token: string) {
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [messages, setMessages] = useState<ChatEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [failedMessage, setFailedMessage] = useState<FailedMessage | null>(null)

  async function deliver(content: string, messageId: string) {
    setLoading(true)
    setError('')
    setFailedMessage(null)
    setMessages((current) => current.map((message) =>
      message.id === messageId ? { ...message, status: 'sending' as const } : message,
    ))

    try {
      const response = await sendAiMessage(token, conversationId === null
        ? { message: content }
        : { conversationId, message: content })
      setConversationId(response.conversation.id)
      setMessages((current) => [
        ...current.map((message) => message.id === messageId ? { ...message, status: 'sent' as const } : message),
        {
          id: response.message.id,
          role: 'assistant',
          content: response.message.content,
          createdAt: response.message.createdAt,
          status: 'sent',
        },
      ])
    } catch {
      setMessages((current) => current.map((message) =>
        message.id === messageId ? { ...message, status: 'failed' as const } : message,
      ))
      setFailedMessage({ id: messageId, content })
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function sendMessage(rawContent: string) {
    const content = rawContent.trim()
    if (!content || loading) return

    const id = `widget-${Date.now()}-${Math.random().toString(36).slice(2)}`
    setMessages((current) => [...current, {
      id,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
      status: 'sending',
    }])
    await deliver(content, id)
  }

  async function retry() {
    if (!failedMessage || loading) return
    await deliver(failedMessage.content, failedMessage.id)
  }

  return { messages, loading, error, sendMessage, retry }
}
