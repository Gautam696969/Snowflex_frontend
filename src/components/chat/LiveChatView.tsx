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
    <div className="live-chat-shell">
      {/* Left panel: Conversations List */}
      <aside className={`chat-sidebar-panel ${activeConversationId ? 'is-hidden-mobile' : ''}`}>
        <div className="chat-sidebar-header">
          <div className="chat-sidebar-title-row">
            <div className="chat-title-wrap">
              <MessageSquare size={19} className="chat-title-icon" />
              <h2>Live Chat</h2>
            </div>
            <button
              type="button"
              className="chat-new-btn"
              onClick={() => setShowNewChatModal(true)}
              aria-label="Start new chat"
              title="New conversation"
            >
              <Plus size={16} />
              <span>New chat</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="chat-search-wrap">
            <Search size={14} className="chat-search-icon" />
            <input
              type="text"
              className="chat-search-input"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search conversations"
            />
            {search && (
              <button
                type="button"
                className="chat-search-clear"
                onClick={() => setSearch('')}
                aria-label="Clear search query"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Conversation List */}
        <div className="chat-conversations-list" tabIndex={0} aria-label="Conversations list">
          {loadingConversations ? (
            <div className="chat-list-loading">
              <Loader2 className="chat-spinner" size={24} />
              <span>Loading conversations...</span>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="chat-list-empty">
              <p>{search ? 'No matching conversations' : 'No conversations yet'}</p>
              {!search && (
                <button
                  type="button"
                  className="chat-start-first-btn"
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
                  className={`chat-conv-item ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => setActiveConversationId(conv.id)}
                  aria-selected={isSelected}
                >
                  <div className="chat-conv-avatar-wrap">
                    <UserAvatar
                      name={conv.otherUser.fullName}
                      avatarUrl={conv.otherUser.avatarUrl}
                      size={42}
                      className="chat-conv-avatar"
                    />
                    <span
                      className={`chat-online-indicator ${isOnline ? 'is-online' : 'is-offline'}`}
                      title={isOnline ? 'Online' : 'Offline'}
                    />
                  </div>

                  <div className="chat-conv-main">
                    <div className="chat-conv-topline">
                      <strong className="chat-conv-name">{conv.otherUser.fullName}</strong>
                      <span className="chat-conv-time">
                        {formatConversationTime(conv.lastMessage?.createdAt || conv.lastMessageAt)}
                      </span>
                    </div>

                    <div className="chat-conv-subline">
                      <RoleBadge role={conv.otherUser.role} />
                      {conv.unreadCount > 0 && (
                        <span className="chat-unread-badge" aria-label={`${conv.unreadCount} unread messages`}>
                          {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                        </span>
                      )}
                    </div>

                    <div className="chat-conv-preview">
                      {conv.lastMessage ? (
                        <span className="chat-preview-text">
                          {conv.lastMessage.senderId === currentUser.id ? 'You: ' : ''}
                          {conv.lastMessage.body}
                        </span>
                      ) : (
                        <span className="chat-preview-empty">New conversation started</span>
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
      <main className={`chat-thread-panel ${!activeConversationId ? 'is-hidden-mobile' : ''}`}>
        {activeConversation ? (
          <MessageThread
            conversation={activeConversation}
            currentUser={currentUser}
            onBack={() => setActiveConversationId(null)}
          />
        ) : (
          <div className="chat-placeholder-view">
            <div className="chat-placeholder-icon">
              <Sparkles size={40} />
            </div>
            <h3>Select a Conversation</h3>
            <p>Choose an existing thread from the left or start a new chat with an authorized colleague.</p>
            <button
              type="button"
              className="chat-placeholder-btn"
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
        <div className="chat-floating-error">
          <AlertCircle size={16} />
          <span>{modalError}</span>
          <button type="button" onClick={() => setModalError('')}><X size={14} /></button>
        </div>
      )}
    </div>
  )
}
