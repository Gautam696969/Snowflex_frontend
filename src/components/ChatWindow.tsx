import { useEffect, useRef, useState } from 'react'
import { Bot, Circle, MessageSquarePlus, X } from 'lucide-react'
import type { ChatEntry } from '../hooks/useWidgetChat'
import ChatInput from './ChatInput'
import ChatMessage from './ChatMessage'

const suggestions = [
  'Apply leave',
  'My leave balance',
  'Status of my last leave',
]

interface ChatWindowProps {
  messages: ChatEntry[]
  userName: string
  avatarUrl?: string | null
  loading: boolean
  progressText?: string
  error: string
  onSend: (message: string) => Promise<void>
  onConfirm: (messageId: string | number, token: string) => void
  onCancel: (messageId: string | number) => void
  onRetry: () => Promise<void>
  onClear: () => void
  onClose: () => void
}

export default function ChatWindow({
  messages,
  userName,
  avatarUrl,
  loading,
  progressText,
  error,
  onSend,
  onConfirm,
  onCancel,
  onRetry,
  onClear,
  onClose,
}: ChatWindowProps) {
  const messagesRef = useRef<HTMLDivElement>(null)
  const [draftValue, setDraftValue] = useState<string | undefined>(undefined)

  useEffect(() => {
    const container = messagesRef.current
    if (container) container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
  }, [messages, loading, error])

  const handleEdit = (text: string) => {
    setDraftValue(text)
  }

  const handleSend = async (msg: string) => {
    setDraftValue('')
    await onSend(msg)
  }

  return (
    <section className="floating-chat-window" id="snowflex-chat-window" aria-label="Snowflex AI Assistant" aria-live="polite">
      <header className="floating-chat-header">
        <span className="floating-chat-header-logo" aria-hidden="true"><Bot size={18} /></span>
        <div className="floating-chat-header-copy">
          <strong>Snowflex AI Assistant</strong>
          <span><Circle size={7} fill="currentColor" /> Online</span>
        </div>
        <button className="floating-chat-close" type="button" onClick={onClear} aria-label="Clear chat" title="Clear chat"><MessageSquarePlus size={16} /></button>
        <button className="floating-chat-close" type="button" onClick={onClose} aria-label="Close chat" title="Close chat"><X size={18} /></button>
      </header>

      <div className="floating-chat-messages" ref={messagesRef} role="log" aria-relevant="additions text">
        {messages.length === 0 ? (
          <div className="floating-chat-welcome">
            <span className="floating-chat-welcome-icon" aria-hidden="true"><Bot size={20} /></span>
            <strong>Hi, I’m your Snowflex AI Assistant.</strong>
            <p>I can help you check balances and apply for leaves.</p>
            <div className="floating-chat-suggestions">
              {suggestions.map((suggestion) => (
                <button type="button" key={suggestion} onClick={() => void handleSend(suggestion)} disabled={loading}>{suggestion}</button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessage
              message={message}
              userName={userName}
              avatarUrl={avatarUrl}
              key={message.id}
              onConfirm={onConfirm}
              onEdit={handleEdit}
              onCancel={onCancel}
            />
          ))
        )}

        {loading && (
          <div className="floating-chat-typing-row" role="status" aria-label="AI is working">
            <span className="floating-chat-avatar" aria-hidden="true"><Bot size={14} /></span>
            <span className="floating-chat-typing"><i /><i /><i /></span>
            <span className="floating-chat-progress-text">{progressText || 'Thinking...'}</span>
          </div>
        )}
        {error && (
          <div className="floating-chat-error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => void onRetry()} disabled={loading}>Retry</button>
          </div>
        )}
      </div>

      <ChatInput disabled={loading} onSend={handleSend} initialValue={draftValue} />
    </section>
  )
}
