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
    <section className="floating-chat-window grid w-[min(380px,calc(100vw-32px))] h-[min(520px,calc(100dvh-120px))] min-h-[360px] overflow-hidden grid-rows-[auto_minmax(0,1fr)_auto] border border-[#dfe7dc] dark:border-[#39483e] rounded-[10px] text-[#243a33] dark:text-[#e8efe9] bg-white dark:bg-[#1c2520] shadow-[0_22px_64px_rgba(17,40,28,0.24),0_3px_12px_rgba(17,40,28,0.1)] dark:shadow-[0_22px_64px_rgba(0,0,0,0.48),0_3px_12px_rgba(0,0,0,0.25)] origin-bottom-right animate-[chat-window-enter_190ms_cubic-bezier(0.2,0.8,0.2,1)_both] pointer-events-auto" id="snowflex-chat-window" aria-label="Snowflex AI Assistant" aria-live="polite">
      <header className="floating-chat-header flex min-h-[62px] items-center gap-[10px] p-[10px_13px] border-b border-[#e8eee6] dark:border-[#354239] bg-[#fbfcf9] dark:bg-[#19221d]">
        <span className="floating-chat-header-logo grid w-[34px] h-[34px] shrink-0 place-items-center border border-[#cee97b]/50 rounded-[9px_9px_9px_3px] text-[#d9ed74] bg-[linear-gradient(145deg,#356b52,#123c2d)] shadow-[inset_0_1px_rgba(255,255,255,0.22),0_3px_6px_rgba(13,45,31,0.17)]" aria-hidden="true"><Bot size={18} /></span>
        <div className="floating-chat-header-copy grid min-w-0 flex-1 gap-[4px]">
          <strong className="overflow-hidden text-[#243a33] dark:text-[#e8efe9] font-bold text-[12px] font-['Manrope',sans-serif] text-ellipsis whitespace-nowrap">Snowflex AI Assistant</strong>
          <span className="inline-flex items-center gap-[5px] text-[#728177] dark:text-[#a5b3a8] text-[10px]"><Circle size={7} fill="currentColor" className="text-[#76a451]" /> Online</span>
        </div>
        <button className="floating-chat-close grid w-[32px] h-[32px] shrink-0 place-items-center border-0 rounded-[5px] text-[#758278] dark:text-[#b3c0b6] bg-transparent cursor-pointer hover:text-[#243a33] dark:hover:text-[#f0f5ef] hover:bg-[#edf2e9] dark:hover:bg-[#2b372f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8aa357] transition-colors" type="button" onClick={onClear} aria-label="Clear chat" title="Clear chat"><MessageSquarePlus size={16} /></button>
        <button className="floating-chat-close grid w-[32px] h-[32px] shrink-0 place-items-center border-0 rounded-[5px] text-[#758278] dark:text-[#b3c0b6] bg-transparent cursor-pointer hover:text-[#243a33] dark:hover:text-[#f0f5ef] hover:bg-[#edf2e9] dark:hover:bg-[#2b372f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8aa357] transition-colors" type="button" onClick={onClose} aria-label="Close chat" title="Close chat"><X size={18} /></button>
      </header>

      <div className="floating-chat-messages flex min-h-0 overflow-y-auto p-[15px_13px] flex-col gap-[13px] overscroll-contain [scrollbar-gutter:stable] scroll-smooth" ref={messagesRef} role="log" aria-relevant="additions text">
        {messages.length === 0 ? (
          <div className="floating-chat-welcome grid w-full my-auto justify-items-center gap-[7px] text-center animate-[slide-up_180ms_ease_both]">
            <span className="floating-chat-welcome-icon grid w-[42px] h-[42px] mb-[3px] place-items-center border border-[#dce8c5] dark:border-[#4a5d3d] rounded-[12px_12px_12px_4px] text-[#254735] dark:text-[#d9edaa] bg-[#edf5dd] dark:bg-[#2b3a2c]" aria-hidden="true"><Bot size={20} /></span>
            <strong className="text-[#243a33] dark:text-[#e8efe9] font-bold text-[13px] font-['Manrope',sans-serif]">Hi, I’m your Snowflex AI Assistant.</strong>
            <p className="m-0 text-[#7a887d] dark:text-[#a1afa5] text-[11px]">I can help you check balances and apply for leaves.</p>
            <div className="floating-chat-suggestions flex w-full mt-[7px] flex-wrap justify-center gap-[7px]">
              {suggestions.map((suggestion) => (
                <button type="button" className="max-w-full min-h-[32px] p-[6px_9px] border border-[#dce6d6] dark:border-[#435148] rounded-[5px] text-[#425e4d] dark:text-[#d4e0d6] bg-[#f9fbf6] dark:bg-[#242e28] text-[10px] text-left cursor-pointer hover:not-disabled:border-[#9fb879] dark:hover:not-disabled:border-[#82975a] hover:not-disabled:bg-[#eff5e7] dark:hover:not-disabled:bg-[#303b30] disabled:cursor-wait disabled:opacity-55 transition-colors duration-140" key={suggestion} onClick={() => void handleSend(suggestion)} disabled={loading}>{suggestion}</button>
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
          <div className="floating-chat-typing-row flex items-end gap-[7px]" role="status" aria-label="AI is working">
            <span className="floating-chat-avatar grid w-[24px] h-[24px] shrink-0 place-items-center border border-[#dce8c5] dark:border-[#4a5d3d] rounded-[7px_7px_7px_2px] text-[#254735] dark:text-[#d9edaa] bg-[#edf5dd] dark:bg-[#2b3a2c]" aria-hidden="true"><Bot size={14} /></span>
            <span className="floating-chat-typing inline-flex items-center gap-[4px] min-h-[31px] px-[11px] py-0 border border-[#e3eae0] dark:border-[#3b493f] rounded-[10px_10px_10px_3px] bg-[#f5f7f3] dark:bg-[#27312b]"><i className="w-[5px] h-[5px] rounded-full bg-[#718d5a] dark:bg-[#c6e65c] animate-[chat-typing_1.05s_ease-in-out_infinite]" /><i className="w-[5px] h-[5px] rounded-full bg-[#718d5a] dark:bg-[#c6e65c] animate-[chat-typing_1.05s_ease-in-out_infinite] [animation-delay:130ms]" /><i className="w-[5px] h-[5px] rounded-full bg-[#718d5a] dark:bg-[#c6e65c] animate-[chat-typing_1.05s_ease-in-out_infinite] [animation-delay:260ms]" /></span>
            <span className="floating-chat-progress-text text-[11px] text-[#7a887d] dark:text-[#a1afa5]">{progressText || 'Thinking...'}</span>
          </div>
        )}
        {error && (
          <div className="floating-chat-error flex items-center justify-between gap-[10px] mx-[2px] my-0 p-[9px_10px] border border-[#efd4cc] dark:border-[#68423b] rounded-[5px] text-[#934c3f] dark:text-[#ffb1a1] bg-[#fff7f4] dark:bg-[#34231f] text-[10px]" role="alert">
            <span>{error}</span>
            <button type="button" className="shrink-0 p-[4px_7px] border border-[#e8c5bb] dark:border-[#805449] rounded-[4px] text-[#934c3f] dark:text-[#ffd0c6] bg-white dark:bg-[#402b26] text-[10px] font-semibold cursor-pointer disabled:cursor-wait disabled:opacity-55" onClick={() => void onRetry()} disabled={loading}>Retry</button>
          </div>
        )}
      </div>

      <ChatInput disabled={loading} onSend={handleSend} initialValue={draftValue} />
    </section>
  )
}
