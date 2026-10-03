import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { Send } from 'lucide-react'

interface ChatInputProps {
  disabled: boolean
  onSend: (message: string) => Promise<void>
}

export default function ChatInput({ disabled, onSend }: ChatInputProps) {
  const [draft, setDraft] = useState('')
  const canSend = draft.trim().length > 0 && !disabled

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
    <form className="floating-chat-input-area" onSubmit={(event) => void submit(event)}>
      <label className="floating-chat-input-wrap">
        <span className="sr-only">Message Snowflex AI Assistant</span>
        <textarea
          value={draft}
          rows={1}
          maxLength={4000}
          disabled={disabled}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? 'Assistant is thinking…' : 'Ask about people operations'}
        />
        <button className="floating-chat-send" type="submit" disabled={!canSend} aria-label="Send message" title="Send message">
          <Send size={17} />
        </button>
      </label>
      <small className="floating-chat-input-hint">Enter to send · Shift+Enter for a new line</small>
    </form>
  )
}
