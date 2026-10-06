import { useRef, useState } from 'react'
import {
  sendWidgetMessage,
  confirmWidgetLeave,
  type LeaveConfirmationPayload,
  type ConfirmLeaveResponse,
} from '../lib/auth-api'

export interface ChatEntry {
  id: string | number
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  status?: 'sending' | 'sent' | 'failed'
  confirmation?: LeaveConfirmationPayload | null
  confirmationStatus?: 'pending' | 'submitting' | 'confirmed' | 'cancelled' | 'error'
  confirmationError?: string
  confirmationResult?: ConfirmLeaveResponse['leaveRequest'] | null
}

interface FailedMessage {
  id: string
  content: string
  history: Array<{ role: 'user' | 'assistant'; content: string }>
}

export function useWidgetChat(token: string) {
  const [messages, setMessages] = useState<ChatEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [progressText, setProgressText] = useState('')
  const [error, setError] = useState('')
  const [failedMessage, setFailedMessage] = useState<FailedMessage | null>(null)
  const requestVersion = useRef(0)

  async function deliver(content: string, messageId: string, history: FailedMessage['history'], version: number) {
    setLoading(true)
    setError('')
    setFailedMessage(null)

    const lower = content.toLowerCase()
    if (lower.includes('leave') || lower.includes('chutti') || lower.includes('apply')) {
      setProgressText('Checking your leave balance & policies...')
    } else {
      setProgressText('Thinking...')
    }

    setMessages((current) => current.map((message) =>
      message.id === messageId ? { ...message, status: 'sending' as const } : message,
    ))

    try {
      const response = await sendWidgetMessage(token, { source: 'widget', message: content, history })
      if (version !== requestVersion.current) return
      setMessages((current) => [
        ...current.map((message) => message.id === messageId ? { ...message, status: 'sent' as const } : message),
        {
          id: response.message.id,
          role: 'assistant',
          content: response.message.content,
          createdAt: response.message.createdAt,
          status: 'sent',
          confirmation: response.message.confirmation || null,
          confirmationStatus: response.message.confirmation ? 'pending' : undefined,
        },
      ])
    } catch {
      if (version !== requestVersion.current) return
      setMessages((current) => current.map((message) =>
        message.id === messageId ? { ...message, status: 'failed' as const } : message,
      ))
      setFailedMessage({ id: messageId, content, history })
      setError('Something went wrong. Please try again.')
    } finally {
      if (version === requestVersion.current) {
        setLoading(false)
        setProgressText('')
      }
    }
  }

  async function sendMessage(rawContent: string) {
    const content = rawContent.trim()
    if (!content || loading) return

    const id = `widget-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const history = messages.map(({ role, content: messageContent }) => ({ role, content: messageContent }))
    const version = requestVersion.current
    setMessages((current) => [...current, {
      id,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
      status: 'sending',
    }])
    await deliver(content, id, history, version)
  }

  async function confirmLeave(messageId: string | number, confirmationToken: string) {
    setMessages((current) =>
      current.map((msg) =>
        msg.id === messageId
          ? { ...msg, confirmationStatus: 'submitting' as const, confirmationError: undefined }
          : msg,
      ),
    )

    try {
      const res = await confirmWidgetLeave(token, confirmationToken)
      setMessages((current) =>
        current.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                confirmationStatus: 'confirmed' as const,
                confirmationResult: res.leaveRequest,
              }
            : msg,
        ),
      )

      // Notify the application to refresh leave tables, balances, sidebar badge, and notification bell
      window.dispatchEvent(new CustomEvent('leaves-updated'))
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to submit leave request. Please try again.'
      setMessages((current) =>
        current.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                confirmationStatus: 'error' as const,
                confirmationError: errorMsg,
              }
            : msg,
        ),
      )
    }
  }

  function cancelConfirmation(messageId: string | number) {
    setMessages((current) =>
      current.map((msg) =>
        msg.id === messageId ? { ...msg, confirmationStatus: 'cancelled' as const } : msg,
      ),
    )
  }

  async function retry() {
    if (!failedMessage || loading) return
    await deliver(failedMessage.content, failedMessage.id, failedMessage.history, requestVersion.current)
  }

  function clearChat() {
    requestVersion.current += 1
    setMessages([])
    setLoading(false)
    setProgressText('')
    setError('')
    setFailedMessage(null)
  }

  return {
    messages,
    loading,
    progressText,
    error,
    sendMessage,
    confirmLeave,
    cancelConfirmation,
    retry,
    clearChat,
  }
}