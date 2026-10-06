import { Bot, Check, Clock3, X } from 'lucide-react'
import type { ChatEntry } from '../hooks/useWidgetChat'
import { renderMarkdown } from '../lib/render-markdown'
import UserAvatar from './UserAvatar'
import LeaveConfirmationCard from './LeaveConfirmationCard'

function formatTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

interface ChatMessageProps {
  message: ChatEntry
  userName: string
  avatarUrl?: string | null
  onConfirm?: (messageId: string | number, token: string) => void
  onEdit?: (text: string) => void
  onCancel?: (messageId: string | number) => void
}

export default function ChatMessage({
  message,
  userName,
  avatarUrl,
  onConfirm,
  onEdit,
  onCancel,
}: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <article className={`floating-chat-message ${isUser ? 'from-user' : 'from-ai'}`}>
      {!isUser && <span className="floating-chat-avatar" aria-hidden="true"><Bot size={14} /></span>}
      <div className="floating-chat-message-stack">
        <div className="floating-chat-bubble">
          {isUser ? message.content : renderMarkdown(message.content)}

          {message.confirmation && (
            <LeaveConfirmationCard
              confirmation={message.confirmation}
              status={message.confirmationStatus}
              error={message.confirmationError}
              result={message.confirmationResult}
              onConfirm={() => onConfirm?.(message.id, message.confirmation!.token)}
              onEdit={() => {
                const conf = message.confirmation!
                const editPrompt = `Apply ${conf.leaveTypeName} from ${conf.startDate} to ${conf.endDate}, reason: ${conf.reason}`
                onEdit?.(editPrompt)
              }}
              onCancel={() => onCancel?.(message.id)}
            />
          )}
        </div>
        <small className="floating-chat-timestamp">
          {isUser && message.status === 'sending' && <Clock3 size={11} aria-label="Sending" />}
          {isUser && message.status === 'sent' && <Check size={11} aria-label="Sent" />}
          {isUser && message.status === 'failed' && <X size={11} aria-label="Failed" />}
          {formatTime(message.createdAt)}
        </small>
      </div>
      {isUser && <UserAvatar name={userName} avatarUrl={avatarUrl} size={24} className="floating-chat-avatar user-avatar" />}
    </article>
  )
}
