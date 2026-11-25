import { Check, CheckCheck, Clock, Video } from 'lucide-react'
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

  if (message.body.startsWith('📹 ')) {
    const cleanText = message.body.replace(/^📹\s*/, '')
    const isMissed = /missed|declined/i.test(cleanText)
    return (
      <div className="flex justify-center my-1.5">
        <div
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11.5px] font-medium border ${
            isMissed
              ? 'bg-[#fef2f2] dark:bg-[#2b1414] text-[#b91c1c] dark:text-[#fca5a5] border-[#fecaca] dark:border-[#4d1f1f]'
              : 'bg-[#f1f5ee] dark:bg-[#1e2923] text-[#355143] dark:text-[#b7c9bd] border-[#dce5d9] dark:border-[#2e3d35]'
          }`}
        >
          <Video size={13} className="shrink-0" />
          <span>{cleanText}</span>
          <span className="text-[10px] opacity-70">{formatMessageTime(message.createdAt)}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`chat-message-row flex w-full ${isMine ? 'is-mine justify-end' : 'is-theirs justify-start'}`}>
      <div className={`chat-message-bubble max-w-[min(72%,560px)] p-[10px_14px_8px] rounded-[14px] text-[13.5px] leading-[1.45] break-words shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${isMine ? 'bubble-mine bg-[#193c33] text-white rounded-br-[3px]' : 'bubble-theirs bg-[#f1f5ee] dark:bg-[#212c26] text-[#1d2521] dark:text-[#e3ebe5] border border-[#e1e7de] dark:border-[#2e3d35] rounded-bl-[3px]'}`}>
        {/* Render text as plain safe React text node to prevent any XSS */}
        <div className="chat-message-text whitespace-pre-wrap select-text">{message.body}</div>
        <div className="chat-message-meta flex items-center justify-end gap-[4px] mt-[4px] text-[10.5px]">
          <span className={`chat-message-time ${isMine ? 'text-white/72' : 'text-[#8c988e]'}`}>{formatMessageTime(message.createdAt)}</span>
          {isMine && (
            <span className="chat-message-status inline-flex items-center" title={isRead ? 'Read' : isDelivered ? 'Delivered' : isPending ? 'Sending' : 'Sent'}>
              {isPending ? (
                <Clock size={12} className="status-clock text-white/60" />
              ) : isRead ? (
                <CheckCheck size={14} className="status-read text-[#d9ed74]" />
              ) : isDelivered ? (
                <CheckCheck size={14} className="status-delivered text-white/85" />
              ) : (
                <Check size={13} className="status-sent text-white/60" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
