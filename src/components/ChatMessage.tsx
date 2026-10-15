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
    <article className={`floating-chat-message flex max-w-[94%] items-end gap-[7px] animate-[slide-up_160ms_ease_both] ${isUser ? 'from-user self-end flex-row-reverse' : 'from-ai'}`}>
      {!isUser && <span className="floating-chat-avatar grid w-[24px] h-[24px] shrink-0 place-items-center border border-[#dce8c5] dark:border-[#4a5d3d] rounded-[7px_7px_7px_2px] text-[#254735] dark:text-[#d9edaa] bg-[#edf5dd] dark:bg-[#2b3a2c]" aria-hidden="true"><Bot size={14} /></span>}
      <div className="floating-chat-message-stack grid min-w-0 gap-[4px]">
        <div className={`floating-chat-bubble p-[9px_11px] text-[11px] leading-[1.55] [overflow-wrap:anywhere] whitespace-pre-wrap ${isUser ? 'border border-[#28543e] dark:border-[#527044] rounded-[10px_10px_3px_10px] text-[#f5f8ef] dark:text-[#eff6df] bg-[#24523c] dark:bg-[#365640]' : 'border border-[#e3eae0] dark:border-[#3b493f] rounded-[10px_10px_10px_3px] text-[#3f5145] dark:text-[#d5dfd6] bg-[#f5f7f3] dark:bg-[#27312b]'}`}>
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
        <small className={`floating-chat-timestamp inline-flex min-h-[12px] items-center justify-end gap-[3px] px-[2px] py-0 text-[9px] ${isUser ? 'text-[#819187] dark:text-[#9baa9f]' : 'text-[#91a096] dark:text-[#9baa9f]'}`}>
          {isUser && message.status === 'sending' && <Clock3 size={11} aria-label="Sending" />}
          {isUser && message.status === 'sent' && <Check size={11} aria-label="Sent" />}
          {isUser && message.status === 'failed' && <X size={11} aria-label="Failed" />}
          {formatTime(message.createdAt)}
        </small>
      </div>
      {isUser && <UserAvatar name={userName} avatarUrl={avatarUrl} size={24} className="floating-chat-avatar user-avatar grid w-[24px] h-[24px] shrink-0 place-items-center border border-[#dfe7dc] dark:border-[#435148] rounded-[7px_7px_7px_2px] text-[#506457] dark:text-[#d4e0d6] bg-[#e9eee7] dark:bg-[#303a33]" />}
    </article>
  )
}
