import { Bot, Sparkles } from 'lucide-react'

interface ChatLauncherButtonProps {
  isOpen: boolean
  onClick: () => void
}

export default function ChatLauncherButton({ isOpen, onClick }: ChatLauncherButtonProps) {
  return (
    <button
      className={`chat-launcher${isOpen ? ' is-open' : ''}`}
      type="button"
      aria-label={isOpen ? 'Close AI assistant' : 'Ask AI'}
      aria-expanded={isOpen}
      aria-controls="snowflex-chat-window"
      title="Ask AI"
      onClick={onClick}
    >
      <span className="chat-launcher-halo" aria-hidden="true" />
      <span className="chat-launcher-face" aria-hidden="true">
        {isOpen ? <Sparkles size={25} strokeWidth={1.5} /> : <Bot size={25} strokeWidth={1.5} />}
      </span>
      <span className="chat-launcher-tooltip" role="tooltip">Ask AI</span>
    </button>
  )
}
