import { useEffect, useRef } from 'react'
import { Bot, Circle, MessageSquarePlus, X } from 'lucide-react'
import type { ChatEntry } from '../hooks/useWidgetChat'
import ChatInput from './ChatInput'
import ChatMessage from './ChatMessage'

const suggestions = [
  'Who is absent today?',
  'Show pending leaves',
  'Summarize attendance',
]

interface ChatWindowProps {
  messages: ChatEntry[]
  loading: boolean
  error: string
  onSend: (message: string) => Promise<void>
  onRetry: () => Promise<void>
  onClear: () => void
  onClose: () => void
}

export default function ChatWindow({ messages, loading, error, onSend, onRetry, onClear, onClose }: ChatWindowProps) {
  const messagesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = messagesRef.current
    if (container) container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
  }, [messages, loading, error])

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
            <p>What can I help you find?</p>
            <div className="floating-chat-suggestions">
              {suggestions.map((suggestion) => (
                <button type="button" key={suggestion} onClick={() => void onSend(suggestion)} disabled={loading}>{suggestion}</button>
              ))}
            </div>
          </div>
        ) : messages.map((message) => <ChatMessage message={message} key={message.id} />)}

        {loading && (
          <div className="floating-chat-typing-row" role="status" aria-label="AI is typing">
            <span className="floating-chat-avatar" aria-hidden="true"><Bot size={14} /></span>
            <span className="floating-chat-typing"><i /><i /><i /></span>
          </div>
        )}
        {error && (
          <div className="floating-chat-error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => void onRetry()} disabled={loading}>Retry</button>
          </div>
        )}
      </div>

      <ChatInput disabled={loading} onSend={onSend} />
    </section>
  )
}
