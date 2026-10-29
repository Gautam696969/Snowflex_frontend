import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useWidgetChat } from '../hooks/useWidgetChat'
import ChatLauncherButton from './ChatLauncherButton'
import ChatWindow from './ChatWindow'

export default function AiChatWidget({ token, userName, avatarUrl }: { token: string; userName: string; avatarUrl?: string | null }) {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()

  // Requirement 1: Hide on the AI Employee route (already an AI chat)
  const searchParams = new URLSearchParams(location.search)
  const isAiEmployeeRoute =
    location.pathname === '/assistant' ||
    location.pathname === '/ai-employee' ||
    (location.pathname === '/dashboard' && searchParams.get('view') === 'assistant')

  if (isAiEmployeeRoute) {
    return null
  }

  const {
    messages,
    loading,
    progressText,
    error,
    sendMessage,
    confirmLeave,
    cancelConfirmation,
    retry,
    clearChat,
  } = useWidgetChat(token)

  useEffect(() => {
    if (!isOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isOpen])

  return (
    <div className="ai-chat-widget fixed z-[10] right-[max(16px,env(safe-area-inset-right,16px))] bottom-[calc(24px+env(safe-area-inset-bottom,0px))] grid justify-items-end gap-[14px] pointer-events-none">
      {isOpen && (
        <ChatWindow
          messages={messages}
          userName={userName}
          avatarUrl={avatarUrl}
          loading={loading}
          progressText={progressText}
          error={error}
          onSend={sendMessage}
          onConfirm={confirmLeave}
          onCancel={cancelConfirmation}
          onRetry={retry}
          onClear={clearChat}
          onClose={() => setIsOpen(false)}
        />
      )}
      <ChatLauncherButton isOpen={isOpen} onClick={() => setIsOpen((open) => !open)} />
    </div>
  )
}
