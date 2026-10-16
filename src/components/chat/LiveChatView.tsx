import { useState, useMemo } from 'react'
import {
  MessageSquare, Plus, Search, X, Loader2, Sparkles, AlertCircle
} from 'lucide-react'
import UserAvatar from '../UserAvatar'
import RoleBadge from './RoleBadge'
import MessageThread from './MessageThread'
import NewChatModal from './NewChatModal'
import { useChat } from '../../context/ChatContext'
import type { SafeUser } from '../../lib/auth-api'

interface LiveChatViewProps {
  currentUser: SafeUser
}

function formatConversationTime(isoDate?: string): string {
  if (!isoDate) return ''
  const date = new Date(isoDate)
  if (isNaN(date.getTime())) return ''

  const now = new Date()
  const isToday = now.toDateString() === date.toDateString()
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (yesterday.toDateString() === date.toDateString()) {
    return 'Yesterday'
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function LiveChatView({ currentUser }: LiveChatViewProps) {
  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    loadingConversations,
    openConversationWithUser,
    onlineUsers,
  } = useChat()

  const [search, setSearch] = useState('')
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [modalError, setModalError] = useState('')

  // Filter conversations by search term
  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return conversations

    return conversations.filter(
      (c) =>
        c.otherUser.fullName.toLowerCase().includes(q) ||
        c.otherUser.email.toLowerCase().includes(q) ||
        c.otherUser.role.toLowerCase().includes(q) ||
        (c.lastMessage && c.lastMessage.body.toLowerCase().includes(q))
    )
  }, [conversations, search])

  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeConversationId) || null
  }, [conversations, activeConversationId])

  const handleStartChatWithUser = async (participantId: number) => {
    try {
      setModalError('')
      await openConversationWithUser(participantId)
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Could not start conversation')
    }
  }

  return (
    <div className="live-chat-shell grid grid-cols-[340px_minmax(0,1fr)] max-[768px]:grid-cols-1 flex-1 min-h-0 h-full max-h-full bg-white dark:bg-[#151b18] rounded-[8px] max-[768px]:rounded-none overflow-hidden shadow-[0_4px_20px_rgba(25,60,51,0.06)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] border border-[#e2e8df] dark:border-[#27342d] max-[768px]:border-none">
      {/* Left panel: Conversations List */}
      <aside className={`chat-sidebar-panel flex flex-col border-r border-[#e5ebe2] dark:border-[#27342d] bg-[#f8faf7] dark:bg-[#18201c] overflow-hidden h-full min-h-0 ${activeConversationId ? 'is-hidden-mobile max-[768px]:hidden' : ''}`}>
        <div className="chat-sidebar-header p-[16px_18px_12px] border-b border-[#e5ebe2] dark:border-[#27342d] bg-white dark:bg-[#18201c]">
          <div className="chat-sidebar-title-row flex items-center justify-between mb-[12px]">
            <div className="chat-title-wrap flex items-center gap-[8px]">
              <MessageSquare size={19} className="chat-title-icon text-[#193c33] dark:text-[#d9ed74]" />
              <h2 className="m-0 text-[17px] font-bold font-sans text-[#193c33] dark:text-[#e3ebe5]">Live Chat</h2>
            </div>
            <button
              type="button"
              className="chat-new-btn inline-flex items-center gap-[5px] px-[11px] py-[6px] rounded-[6px] bg-[#193c33] dark:bg-[#d9ed74] text-white dark:text-[#193c33] border border-[#193c33] dark:border-[#d9ed74] text-[11.5px] font-semibold cursor-pointer transition-all duration-150 ease-in-out hover:bg-[#255448] dark:hover:bg-[#e5f79b] hover:border-[#255448] dark:hover:border-[#e5f79b] hover:text-[#d9ed74] dark:hover:text-[#193c33]"
              onClick={() => setShowNewChatModal(true)}
              aria-label="Start new chat"
              title="New conversation"
            >
              <Plus size={16} />
              <span>New chat</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="chat-search-wrap relative flex items-center">
            <Search size={14} className="chat-search-icon absolute left-[10px] text-[#8c988e] pointer-events-none" />
            <input
              type="text"
              className="chat-search-input w-full h-[35px] pl-[32px] pr-[30px] border border-[#dbe2d8] dark:border-[#2e3d35] rounded-[6px] bg-[#f2f5f0] dark:bg-[#1d2722] text-[#193c33] dark:text-[#e3ebe5] text-[12.5px] outline-none transition-[border-color,background] duration-140 ease-in-out focus:border-[#193c33] dark:focus:border-[#4b6255] focus:bg-white dark:focus:bg-[#23302a]"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search conversations"
            />
            {search && (
              <button
                type="button"
                className="chat-search-clear absolute right-[8px] grid place-items-center border-none bg-transparent text-[#8c988e] cursor-pointer"
                onClick={() => setSearch('')}
                aria-label="Clear search query"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Conversation List */}
        <div className="chat-conversations-list flex-1 min-h-0 overflow-y-auto overscroll-contain p-[8px] flex flex-col gap-[4px]" tabIndex={0} aria-label="Conversations list">
          {loadingConversations ? (
            <div className="chat-list-loading flex flex-col items-center justify-center p-[40px_16px] gap-[10px] text-[#839286] text-[13px] text-center">
              <Loader2 className="chat-spinner animate-spin" size={24} />
              <span>Loading conversations...</span>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="chat-list-empty flex flex-col items-center justify-center p-[40px_16px] gap-[10px] text-[#839286] text-[13px] text-center">
              <p>{search ? 'No matching conversations' : 'No conversations yet'}</p>
              {!search && (
                <button
                  type="button"
                  className="chat-start-first-btn inline-flex items-center gap-[6px] mt-[8px] px-[14px] py-[6px] rounded-[6px] bg-[#193c33] dark:bg-[#d9ed74] text-white dark:text-[#193c33] border-none text-[12px] font-semibold cursor-pointer hover:bg-[#255448] dark:hover:bg-[#e5f79b] transition-colors"
                  onClick={() => setShowNewChatModal(true)}
                >
                  <Plus size={14} /> Start a conversation
                </button>
              )}
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = conv.id === activeConversationId
              const presence = onlineUsers.get(conv.otherUser.id)
              const isOnline = presence?.isOnline ?? conv.otherUser.isOnline

              return (
                <button
                  key={conv.id}
                  type="button"
                  className={`chat-conv-item flex items-center gap-[12px] w-full p-[10px_12px] border border-transparent rounded-[8px] bg-transparent cursor-pointer text-left transition-all duration-140 ease-in-out hover:bg-[#edf2eb] dark:hover:bg-[#222d27] ${
                    isSelected ? 'is-selected bg-[#e4ebe0] dark:bg-[#27342d] border-[#d1ded0] dark:border-[#3b4d43]' : ''
                  }`}
                  onClick={() => setActiveConversationId(conv.id)}
                  aria-selected={isSelected}
                >
                  <div className="chat-conv-avatar-wrap relative shrink-0">
                    <UserAvatar
                      name={conv.otherUser.fullName}
                      avatarUrl={conv.otherUser.avatarUrl}
                      size={42}
                      className="chat-conv-avatar"
                    />
                    <span
                      className={`chat-online-indicator absolute bottom-0 right-0 w-[11px] h-[11px] rounded-full border-[2px] border-white dark:border-[#18201c] ${
                        isOnline ? 'is-online bg-[#10b981]' : 'is-offline bg-[#9ca3af]'
                      }`}
                      title={isOnline ? 'Online' : 'Offline'}
                    />
                  </div>

                  <div className="chat-conv-main flex-1 min-w-0 flex flex-col gap-[3px]">
                    <div className="chat-conv-topline flex items-baseline justify-between gap-[8px]">
                      <strong className="chat-conv-name text-[13px] font-semibold text-[#193c33] dark:text-[#e3ebe5] truncate">{conv.otherUser.fullName}</strong>
                      <span className="chat-conv-time text-[11px] text-[#8c988e] shrink-0">
                        {formatConversationTime(conv.lastMessage?.createdAt || conv.lastMessageAt)}
                      </span>
                    </div>

                    <div className="chat-conv-subline flex items-center justify-between gap-[6px]">
                      <RoleBadge role={conv.otherUser.role} />
                      {conv.unreadCount > 0 && (
                        <span className="chat-unread-badge inline-flex items-center justify-center min-w-[18px] h-[18px] px-[5px] rounded-[9px] bg-[#ef4444] text-white text-[10.5px] font-bold leading-none" aria-label={`${conv.unreadCount} unread messages`}>
                          {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                        </span>
                      )}
                    </div>

                    <div className="chat-conv-preview text-[12px] text-[#637166] dark:text-[#9caaa0] truncate">
                      {conv.lastMessage ? (
                        <span className="chat-preview-text truncate">
                          {conv.lastMessage.senderId === currentUser.id ? 'You: ' : ''}
                          {conv.lastMessage.body}
                        </span>
                      ) : (
                        <span className="chat-preview-empty italic text-[#9aa89d]">New conversation started</span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </aside>

      {/* Right panel: Active Thread or Placeholder */}
      <main className={`chat-thread-panel flex flex-col h-full min-h-0 bg-white dark:bg-[#151b18] overflow-hidden ${!activeConversationId ? 'is-hidden-mobile max-[768px]:hidden' : ''}`}>
        {activeConversation ? (
          <MessageThread
            conversation={activeConversation}
            currentUser={currentUser}
            onBack={() => setActiveConversationId(null)}
          />
        ) : (
          <div className="chat-placeholder-view m-auto flex flex-col items-center justify-center p-[40px] text-center max-w-[420px]">
            <div className="chat-placeholder-icon grid place-items-center w-[72px] h-[72px] rounded-full bg-[#f1f5ee] dark:bg-[#1d2722] text-[#193c33] dark:text-[#d9ed74] mb-[18px]">
              <Sparkles size={40} />
            </div>
            <h3 className="m-[0_0_8px] text-[19px] font-bold font-sans text-[#193c33] dark:text-[#e3ebe5]">Select a Conversation</h3>
            <p className="m-[0_0_20px] text-[13.5px] text-[#728175] dark:text-[#9aa99d] leading-[1.5]">Choose an existing thread from the left or start a new chat with an authorized colleague.</p>
            <button
              type="button"
              className="chat-placeholder-btn inline-flex items-center gap-[7px] px-[18px] py-[9px] rounded-[6px] bg-[#193c33] dark:bg-[#d9ed74] hover:bg-[#255448] dark:hover:bg-[#e5f79b] text-white dark:text-[#193c33] border-none text-[13px] font-semibold cursor-pointer transition-colors duration-150 ease-in-out"
              onClick={() => setShowNewChatModal(true)}
            >
              <Plus size={16} /> Start New Chat
            </button>
          </div>
        )}
      </main>

      {/* New Chat Modal */}
      <NewChatModal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onSelectUser={handleStartChatWithUser}
      />

      {modalError && (
        <div className="chat-floating-error fixed bottom-[24px] right-[24px] flex items-center gap-[8px] p-[10px_16px] rounded-[8px] bg-[#fee2e2] dark:bg-[#451212] text-[#991b1b] dark:text-[#fca5a5] border border-[#fecaca] dark:border-[#7f1d1d] shadow-[0_4px_15px_rgba(0,0,0,0.1)] text-[13px] z-[110]">
          <AlertCircle size={16} />
          <span>{modalError}</span>
          <button type="button" onClick={() => setModalError('')} className="border-none bg-transparent text-[#991b1b] dark:text-[#fca5a5] cursor-pointer"><X size={14} /></button>
        </div>
      )}
    </div>
  )
}
