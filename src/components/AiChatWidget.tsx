import { useEffect, useState } from 'react'
import { useAiChat } from '../hooks/useAiChat'
import ChatLauncherButton from './ChatLauncherButton'
import ChatWindow from './ChatWindow'

export default function AiChatWidget({ token }: { token: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const { messages, loading, error, sendMessage, retry } = useAiChat(token)

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
          loading={loading}
          error={error}
          onSend={sendMessage}
          onRetry={retry}
          onClose={() => setIsOpen(false)}
        />
      )}
      <ChatLauncherButton isOpen={isOpen} onClick={() => setIsOpen((open) => !open)} />
    </div>
  )
}
