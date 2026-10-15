import { useState, useEffect, type FormEvent, type KeyboardEvent } from 'react'
import { Send } from 'lucide-react'

interface ChatInputProps {
  disabled: boolean
  onSend: (message: string) => Promise<void>
  initialValue?: string
}

export default function ChatInput({ disabled, onSend, initialValue }: ChatInputProps) {
  const [draft, setDraft] = useState(initialValue || '')
  const canSend = draft.trim().length > 0 && !disabled

  // If initialValue changes, update draft
  useEffect(() => {
    if (initialValue !== undefined) {
      setDraft(initialValue)
    }
  }, [initialValue])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSend) return
    const message = draft.trim()
    setDraft('')
    await onSend(message)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      event.currentTarget.form?.requestSubmit()
    }
  }

  return (
    <form className="floating-chat-input-area grid gap-[6px] p-[10px_11px_9px] border-t border-[#e8eee6] dark:border-[#354239] bg-[#fbfcf9] dark:bg-[#19221d]" onSubmit={(event) => void submit(event)}>
      <label className="floating-chat-input-wrap flex min-h-[43px] items-end gap-[6px] p-[6px_6px_6px_10px] border border-[#dce5d9] dark:border-[#435148] rounded-[7px] bg-white dark:bg-[#131b16] focus-within:border-[#8aa357] focus-within:ring-3 focus-within:ring-[#8aa357]/13 transition-all duration-140">
        <span className="sr-only">Message Snowflex AI Assistant</span>
        <textarea
          value={draft}
          rows={1}
          maxLength={4000}
          disabled={disabled}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? 'Assistant is thinking…' : 'Ask about people operations'}
          className="w-full min-w-0 min-h-[28px] max-h-[92px] py-[5px] px-0 border-0 outline-none resize-none text-[#293f34] dark:text-[#edf2ec] placeholder-[#96a39a] dark:placeholder-[#87978b] bg-transparent text-[11px] leading-[1.45] disabled:cursor-wait disabled:opacity-60"
        />
        <button className="floating-chat-send grid w-[31px] h-[31px] shrink-0 place-items-center border-0 rounded-[5px] text-[#20372b] dark:text-[#182119] bg-[#c6e65c] cursor-pointer hover:not-disabled:-translate-y-[1px] hover:not-disabled:bg-[#d4f174] disabled:text-[#9ba69e] disabled:bg-[#edf0eb] dark:disabled:bg-[#2b372f] disabled:cursor-not-allowed transition-all duration-140" type="submit" disabled={!canSend} aria-label="Send message" title="Send message">
          <Send size={17} />
        </button>
      </label>
      <small className="floating-chat-input-hint pl-[2px] text-[#9aa69d] dark:text-[#9baa9f] text-[9px]">Enter to send · Shift+Enter for a new line</small>
    </form>
  )
}
