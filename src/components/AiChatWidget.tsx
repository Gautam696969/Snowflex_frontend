import { useEffect, useState } from 'react'
import { useWidgetChat } from '../hooks/useWidgetChat'
import ChatLauncherButton from './ChatLauncherButton'
import ChatWindow from './ChatWindow'

export default function AiChatWidget({ token, userName, avatarUrl }: { token: string; userName: string; avatarUrl?: string | null }) {
  const [isOpen, setIsOpen] = useState(false)
  const { messages, loading, error, sendMessage, retry, clearChat } = useWidgetChat(token)

  useEffect(() => {
    if (!isOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isOpen])

  return (
    <div className="ai-chat-widget">
      {isOpen && (
        <ChatWindow
          messages={messages}
          userName={userName}
          avatarUrl={avatarUrl}
          loading={loading}
          error={error}
          onSend={sendMessage}
          onRetry={retry}
          onClear={clearChat}
          onClose={() => setIsOpen(false)}
        />
      )}
      <ChatLauncherButton isOpen={isOpen} onClick={() => setIsOpen((open) => !open)} />
    </div>
  )
}
