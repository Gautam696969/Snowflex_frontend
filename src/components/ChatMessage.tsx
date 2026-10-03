import { Bot, Check, Clock3, User, X } from 'lucide-react'
import type { ChatEntry } from '../hooks/useAiChat'

function formatTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export default function ChatMessage({ message }: { message: ChatEntry }) {
  const isUser = message.role === 'user'

  return (
    <article className={`floating-chat-message ${isUser ? 'from-user' : 'from-ai'}`}>
      {!isUser && <span className="floating-chat-avatar" aria-hidden="true"><Bot size={14} /></span>}
      <div className="floating-chat-message-stack">
        <div className="floating-chat-bubble">{message.content}</div>
        <small className="floating-chat-timestamp">
          {isUser && message.status === 'sending' && <Clock3 size={11} aria-label="Sending" />}
          {isUser && message.status === 'sent' && <Check size={11} aria-label="Sent" />}
          {isUser && message.status === 'failed' && <X size={11} aria-label="Failed" />}
          {formatTime(message.createdAt)}
        </small>
      </div>
      {isUser && <span className="floating-chat-avatar user-avatar" aria-hidden="true"><User size={14} /></span>}
    </article>
  )
}
