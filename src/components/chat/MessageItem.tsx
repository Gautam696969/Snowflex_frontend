import { Check, CheckCheck, Clock } from 'lucide-react'
import type { ChatMessageItem } from '../../lib/chat-api'

interface MessageItemProps {
  message: ChatMessageItem
  isMine: boolean
}

function formatMessageTime(isoDate: string): string {
  if (!isoDate) return ''
  const date = new Date(isoDate)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function MessageItem({ message, isMine }: MessageItemProps) {
  const isRead = Boolean(message.readAt)
  const isDelivered = Boolean(message.deliveredAt)
  const isPending = Boolean(message.isPending)

  return (
    <div className={`chat-message-row ${isMine ? 'is-mine' : 'is-theirs'}`}>
      <div className={`chat-message-bubble ${isMine ? 'bubble-mine' : 'bubble-theirs'}`}>
        {/* Render text as plain safe React text node to prevent any XSS */}
        <div className="chat-message-text">{message.body}</div>
        <div className="chat-message-meta">
          <span className="chat-message-time">{formatMessageTime(message.createdAt)}</span>
          {isMine && (
            <span className="chat-message-status" title={isRead ? 'Read' : isDelivered ? 'Delivered' : isPending ? 'Sending' : 'Sent'}>
              {isPending ? (
                <Clock size={12} className="status-clock" />
              ) : isRead ? (
                <CheckCheck size={14} className="status-read" />
              ) : isDelivered ? (
                <CheckCheck size={14} className="status-delivered" />
              ) : (
                <Check size={13} className="status-sent" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
