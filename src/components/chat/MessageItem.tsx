import { Check, CheckCheck, Clock, Video, Users, Calendar } from 'lucide-react'
import type { ChatMessageItem } from '../../lib/chat-api'
import { useMeeting } from '../../context/MeetingContext'

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

interface MeetingCardPayload {
  meetingCode: string
  title: string
  hostName: string
  status: string
  scheduledAt: string | null
  startedAt: string | null
  participantCount: number
}

export default function MessageItem({ message, isMine }: MessageItemProps) {
  const { openPreJoin } = useMeeting()
  const isRead = Boolean(message.readAt)
  const isDelivered = Boolean(message.deliveredAt)
  const isPending = Boolean(message.isPending)

  if (message.body.startsWith('[MEETING_CARD]')) {
    try {
      const card = JSON.parse(message.body.slice('[MEETING_CARD]'.length)) as MeetingCardPayload
      const when = card.scheduledAt
        ? new Date(card.scheduledAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : card.startedAt
          ? new Date(card.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : formatMessageTime(message.createdAt)

      return (
        <div className="flex justify-center my-2">
          <div className="w-full max-w-[340px] rounded-2xl bg-[#f7faf5] dark:bg-[#19241e] border border-[#d6e2d2] dark:border-[#2c4034] p-3.5 shadow-sm flex flex-col gap-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#193c33] text-[#d9ed74] grid place-items-center shrink-0">
                  <Video size={16} />
                </div>
                <div className="min-w-0">
                  <strong className="block text-[13px] font-bold text-[#193c33] dark:text-[#edf5ef] truncate">
                    {card.title}
                  </strong>
                  <span className="block text-[11px] text-[#64776c] dark:text-[#96a99d]">
                    Host: {card.hostName}
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase bg-[#ecfdf5] text-[#059669] dark:bg-[#122b1f] dark:text-[#34d399] border border-[#a7f3d0]/60 shrink-0">
                {card.status}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#55675c] dark:text-[#9cb0a3]">
              <span className="inline-flex items-center gap-1">
                <Calendar size={12} /> {when}
              </span>
              <span className="inline-flex items-center gap-1">
                <Users size={12} /> {card.participantCount} invited
              </span>
            </div>

            <button
              type="button"
              onClick={() => void openPreJoin(card.meetingCode)}
              className="w-full py-2 rounded-lg bg-[#193c33] hover:bg-[#245447] text-[#d9ed74] text-xs font-bold border-0 cursor-pointer transition-colors"
            >
              Join Meeting
            </button>
          </div>
        </div>
      )
    } catch {
      // fall through if malformed
    }
  }

  if (message.body.startsWith('📹 ') || message.body.startsWith('🎥 ')) {
    const cleanText = message.body.replace(/^(📹|🎥)\s*/, '')
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
