import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import {
  ArrowLeft, Send, ArrowDown, WifiOff, AlertTriangle, Loader2, Sparkles
} from 'lucide-react'
import UserAvatar from '../UserAvatar'
import RoleBadge from './RoleBadge'
import MessageItem from './MessageItem'
import { fetchMessages, type ChatConversationItem, type ChatMessageItem } from '../../lib/chat-api'
import { useChat } from '../../context/ChatContext'
import type { SafeUser } from '../../lib/auth-api'

interface MessageThreadProps {
  conversation: ChatConversationItem
  currentUser: SafeUser
  onBack?: () => void
}

function formatDateSeparator(dateStr: string): string {
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (msgDate.getTime() === today.getTime()) {
    return 'Today'
  }
  if (msgDate.getTime() === yesterday.getTime()) {
    return 'Yesterday'
  }

  return msgDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: msgDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

function formatLastSeen(lastSeen: string | null): string {
  if (!lastSeen) return 'Offline'
  const date = new Date(lastSeen)
  if (isNaN(date.getTime())) return 'Offline'

  const now = new Date()
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000)

  if (diffMinutes < 1) return 'Last seen just now'
  if (diffMinutes < 60) return `Last seen ${diffMinutes}m ago`

  const isToday = now.toDateString() === date.toDateString()
  if (isToday) {
    return `Last seen today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }

  return `Last seen ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

export default function MessageThread({ conversation, currentUser, onBack }: MessageThreadProps) {
  const {
    socket,
    connectionStatus,
    sendMessage,
    markAsRead,
    sendTypingStart,
    sendTypingStop,
    typingUsers,
    onlineUsers,
  } = useChat()

  const [messages, setMessages] = useState<ChatMessageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [nextCursor, setNextCursor] = useState<number | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [sending, setSending] = useState(false)
  const [showScrollBottom, setShowScrollBottom] = useState(false)
  const [sendError, setSendError] = useState('')

  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const isScrolledToBottomRef = useRef(true)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const otherUserPresence = onlineUsers.get(conversation.otherUser.id)
  const isOtherOnline = otherUserPresence?.isOnline ?? conversation.otherUser.isOnline
  const otherLastSeen = otherUserPresence?.lastSeen ?? conversation.otherUser.lastSeen

  const isTyping = typingUsers.get(conversation.id)

  // Load initial messages
  useEffect(() => {
    let active = true
    setLoading(true)
    setMessages([])
    setNextCursor(null)
    setHasMore(false)
    setSendError('')

    fetchMessages(conversation.id, undefined, 30)
      .then((res) => {
        if (!active) return
        setMessages(res.messages)
        setNextCursor(res.nextCursor)
        setHasMore(res.hasMore)
        void markAsRead(conversation.id, conversation.otherUser.id)
      })
      .catch((err) => {
        if (active) setSendError(err instanceof Error ? err.message : 'Failed to load messages')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [conversation.id, conversation.otherUser.id, markAsRead])

  // Scroll to bottom on initial message load
  useEffect(() => {
    if (!loading && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }, [loading])

  // Real-time message listener for active conversation
  useEffect(() => {
    if (!socket) return

    const handleNewMessage = (msg: ChatMessageItem) => {
      if (msg.conversationId !== conversation.id) return

      setMessages((prev) => {
        // Deduplicate
        if (prev.some((m) => m.id === msg.id || (msg.clientMessageId && m.clientMessageId === msg.clientMessageId))) {
          return prev.map((m) =>
            m.id === msg.id || (msg.clientMessageId && m.clientMessageId === msg.clientMessageId)
              ? { ...msg, isPending: false }
              : m
          )
        }
        return [...prev, msg]
      })

      // Auto-scroll if user is near bottom
      if (isScrolledToBottomRef.current && messagesContainerRef.current) {
        setTimeout(() => {
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
          }
        }, 50)
      }

      // Mark read if it's from the other participant
      if (msg.senderId !== currentUser.id) {
        void markAsRead(conversation.id, conversation.otherUser.id)
      }
    }

    const handleReadReceipt = ({ conversationId, readAt }: { conversationId: number; readerId: number; readAt: string }) => {
      if (conversationId !== conversation.id) return
      setMessages((prev) =>
        prev.map((m) => (m.senderId === currentUser.id && !m.readAt ? { ...m, readAt, deliveredAt: m.deliveredAt || readAt } : m))
      )
    }

    const handleDeliveredReceipt = ({ messageId, conversationId, deliveredAt }: { messageId: number; conversationId: number; deliveredAt: string }) => {
      if (conversationId !== conversation.id) return
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, deliveredAt: m.deliveredAt || deliveredAt } : m))
      )
    }

    socket.on('message:new', handleNewMessage)
    socket.on('message:read', handleReadReceipt)
    socket.on('message:delivered', handleDeliveredReceipt)

    return () => {
      socket.off('message:new', handleNewMessage)
      socket.off('message:read', handleReadReceipt)
      socket.off('message:delivered', handleDeliveredReceipt)
    }
  }, [socket, conversation.id, conversation.otherUser.id, currentUser.id, markAsRead])

  // Load older messages (infinite scroll upwards)
  const loadEarlierMessages = useCallback(async () => {
    if (!hasMore || !nextCursor || loadingOlder) return
    setLoadingOlder(true)

    const container = messagesContainerRef.current
    const prevScrollHeight = container?.scrollHeight || 0

    try {
      const res = await fetchMessages(conversation.id, nextCursor, 30)
      setMessages((prev) => [...res.messages, ...prev])
      setNextCursor(res.nextCursor)
      setHasMore(res.hasMore)

      // Restore relative scroll offset after prepending older messages
      requestAnimationFrame(() => {
        if (container) {
          const newScrollHeight = container.scrollHeight
          container.scrollTop = newScrollHeight - prevScrollHeight
        }
      })
    } catch {
      // background error ignored
    } finally {
      setLoadingOlder(false)
    }
  }, [conversation.id, hasMore, nextCursor, loadingOlder])

  // Scroll listener for scroll-to-bottom button & top infinite scroll
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const { scrollTop, scrollHeight, clientHeight } = container
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight

    isScrolledToBottomRef.current = distanceFromBottom < 100
    setShowScrollBottom(distanceFromBottom > 250)

    // Trigger load older messages when near top
    if (scrollTop < 50 && hasMore && !loadingOlder) {
      void loadEarlierMessages()
    }
  }, [hasMore, loadingOlder, loadEarlierMessages])

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth',
      })
    }
  }

  // Handle input typing
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    setSendError('')

    // Emit typing indicator
    sendTypingStart(conversation.id, conversation.otherUser.id)

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => {
      sendTypingStop(conversation.id, conversation.otherUser.id)
    }, 2000)
  }

  // Handle message sending
  const handleSend = async () => {
    const text = inputValue.trim()
    if (!text || sending || conversation.isReadOnly || connectionStatus !== 'connected') return

    if (text.length > 2000) {
      setSendError('Message exceeds maximum limit of 2000 characters')
      return
    }

    setSending(true)
    setSendError('')
    sendTypingStop(conversation.id, conversation.otherUser.id)
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)

    // Optimistic message UI item
    const tempId = -Date.now()
    const tempMessage: ChatMessageItem = {
      id: tempId,
      conversationId: conversation.id,
      senderId: currentUser.id,
      body: text,
      createdAt: new Date().toISOString(),
      deliveredAt: null,
      readAt: null,
      clientMessageId: `tmp-${Date.now()}`,
      isDeleted: false,
      isPending: true,
    }

    setMessages((prev) => [...prev, tempMessage])
    setInputValue('')

    // Auto-scroll down
    setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
      }
    }, 20)

    try {
      const saved = await sendMessage(conversation.id, conversation.otherUser.id, text)
      // Replace optimistic message with saved message from server
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...saved, isPending: false } : m)))
    } catch (err: unknown) {
      // Remove optimistic message if failed
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      setSendError(err instanceof Error ? err.message : 'Failed to send message')
      setInputValue(text) // Restore text on failure
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  // Group messages with date separators
  const renderedElements = useMemo(() => {
    const elements: React.ReactNode[] = []
    let lastDateKey = ''

    messages.forEach((msg) => {
      const dateKey = msg.createdAt ? new Date(msg.createdAt).toDateString() : ''
      if (dateKey && dateKey !== lastDateKey) {
        elements.push(
          <div key={`sep-${dateKey}-${msg.id}`} className="chat-date-separator">
            <span>{formatDateSeparator(msg.createdAt)}</span>
          </div>
        )
        lastDateKey = dateKey
      }

      elements.push(
        <MessageItem
          key={`msg-${msg.id}-${msg.clientMessageId || ''}`}
          message={msg}
          isMine={msg.senderId === currentUser.id}
        />
      )
    })

    return elements
  }, [messages, currentUser.id])

  const isDisconnected = connectionStatus === 'disconnected' || connectionStatus === 'reconnecting'

  return (
    <div className="chat-thread-container flex flex-col h-full min-h-0 relative overflow-hidden">
      {/* Header */}
      <div className="chat-thread-header flex items-center gap-[12px] px-[20px] py-[12px] border-b border-[#e5ebe2] dark:border-[#27342d] bg-white dark:bg-[#18201c] shrink-0">
        {onBack && (
          <button
            type="button"
            className="chat-thread-back-btn grid place-items-center w-[32px] h-[32px] border border-[#dfe5dc] dark:border-[#2e3d35] rounded-[6px] bg-transparent text-[#193c33] dark:text-[#e3ebe5] cursor-pointer hover:bg-[#f2f5f0] dark:hover:bg-[#222d27] transition-colors"
            onClick={onBack}
            aria-label="Back to conversations list"
          >
            <ArrowLeft size={18} />
          </button>
        )}

        <div className="chat-thread-user-info flex items-center gap-[12px] min-w-0">
          <div className="chat-thread-avatar-wrap relative shrink-0">
            <UserAvatar
              name={conversation.otherUser.fullName}
              avatarUrl={conversation.otherUser.avatarUrl}
              size={40}
              className="chat-thread-avatar"
            />
            <span
              className={`chat-online-indicator absolute bottom-0 right-0 w-[10px] h-[10px] rounded-full border-[2px] border-white dark:border-[#18201c] ${
                isOtherOnline ? 'is-online bg-[#10b981]' : 'is-offline bg-[#9aa89d]'
              }`}
              title={isOtherOnline ? 'Online' : 'Offline'}
            />
          </div>

          <div className="chat-thread-user-details flex flex-col gap-[2px] min-w-0">
            <div className="chat-thread-name-row flex items-center gap-[8px]">
              <strong className="chat-thread-name text-[14.5px] font-bold text-[#193c33] dark:text-[#e3ebe5]">{conversation.otherUser.fullName}</strong>
              <RoleBadge role={conversation.otherUser.role} />
            </div>
            <div className="chat-thread-status-row text-[11.5px]">
              {isTyping ? (
                <span className="chat-typing-status inline-flex items-center gap-[5px] text-[#193c33] dark:text-[#e3ebe5] font-medium">
                  <span className="chat-typing-dots inline-flex gap-[3px]">
                    <span className="w-[4px] h-[4px] rounded-full bg-[#193c33] dark:bg-[#e3ebe5] animate-[chat-bounce_1.4s_infinite_ease-in-out_both] [animation-delay:-0.32s]" />
                    <span className="w-[4px] h-[4px] rounded-full bg-[#193c33] dark:bg-[#e3ebe5] animate-[chat-bounce_1.4s_infinite_ease-in-out_both] [animation-delay:-0.16s]" />
                    <span className="w-[4px] h-[4px] rounded-full bg-[#193c33] dark:bg-[#e3ebe5] animate-[chat-bounce_1.4s_infinite_ease-in-out_both]" />
                  </span>
                  {isTyping} is typing...
                </span>
              ) : isOtherOnline ? (
                <span className="chat-status-online text-[#10b981] font-semibold">Online</span>
              ) : (
                <span className="chat-status-offline text-[#8c988e]">{formatLastSeen(otherLastSeen)}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Connection & Read-Only Status Banners */}
      {isDisconnected && (
        <div className="chat-connection-banner flex items-center justify-center gap-[8px] px-[16px] py-[8px] text-[12px] font-medium shrink-0 bg-[#fef3c7] dark:bg-[#422006] text-[#92400e] dark:text-[#fef08a] border-b border-[#fde68a] dark:border-[#713f12]">
          <WifiOff size={14} />
          <span>{connectionStatus === 'reconnecting' ? 'Reconnecting to live chat...' : 'Disconnected from chat server. Reconnecting...'}</span>
        </div>
      )}

      {conversation.isReadOnly && (
        <div className="chat-readonly-banner flex items-center justify-center gap-[8px] px-[16px] py-[8px] text-[12px] font-medium shrink-0 bg-[#fee2e2] dark:bg-[#451212] text-[#991b1b] dark:text-[#fca5a5] border-b border-[#fecaca] dark:border-[#7f1d1d]">
          <AlertTriangle size={15} />
          <span>This conversation is read-only. Policy restricts messaging between your current roles.</span>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div
        className="chat-messages-scroll flex-1 min-h-0 overflow-y-auto overscroll-contain p-[20px_24px] flex flex-col outline-none bg-[#fdfdfc] dark:bg-[#141a17]"
        ref={messagesContainerRef}
        onScroll={handleScroll}
        tabIndex={0}
        aria-label="Message history"
      >
        {loadingOlder && (
          <div className="chat-loading-older flex items-center justify-center p-[12px] gap-[8px] text-[12px] text-[#8c988e]">
            <Loader2 className="chat-spinner animate-spin" size={18} />
            <span>Loading older messages...</span>
          </div>
        )}

        {loading ? (
          <div className="chat-messages-loading flex items-center justify-center p-[12px] gap-[8px] text-[12px] text-[#8c988e]">
            <Loader2 className="chat-spinner animate-spin" size={32} />
            <p>Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="chat-messages-empty m-auto flex flex-col items-center justify-center p-[30px] text-center text-[#8c988e]">
            <div className="chat-empty-icon grid place-items-center w-[56px] h-[56px] rounded-full bg-[#f1f5ee] dark:bg-[#1d2722] text-[#193c33] dark:text-[#d9ed74] mb-[14px]">
              <Sparkles size={28} />
            </div>
            <h4 className="m-[0_0_6px] text-[16px] font-bold text-[#193c33] dark:text-[#e3ebe5]">No messages yet</h4>
            <p className="m-0 text-[13px] max-w-[320px]">Say hello to start the conversation with {conversation.otherUser.fullName}!</p>
          </div>
        ) : (
          <div className="chat-messages-list flex flex-col gap-[8px]">
            {renderedElements}
          </div>
        )}
      </div>

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <button
          type="button"
          className="chat-scroll-bottom-btn absolute right-[28px] bottom-[84px] grid place-items-center w-[38px] h-[38px] rounded-full bg-[#193c33] dark:bg-[#27342d] hover:bg-[#255448] dark:hover:bg-[#34443b] text-white dark:text-[#d9ed74] border border-[#285448] dark:border-[#3b4d43] shadow-[0_4px_12px_rgba(25,60,51,0.25)] cursor-pointer transition-transform duration-150 ease-in-out hover:-translate-y-[2px] z-[4]"
          onClick={scrollToBottom}
          aria-label="Scroll to newest messages"
          title="Scroll to newest messages"
        >
          <ArrowDown size={16} />
        </button>
      )}

      {/* Send Error Notice */}
      {sendError && (
        <div className="chat-send-error flex items-center gap-[6px] px-[16px] py-[6px] bg-[#fee2e2] dark:bg-[#451212] text-[#991b1b] dark:text-[#fca5a5] text-[12px]">
          <AlertTriangle size={14} />
          <span>{sendError}</span>
        </div>
      )}

      {/* Message Input Bar */}
      <div className={`chat-input-container p-[12px_20px_14px] border-t border-[#e5ebe2] dark:border-[#27342d] bg-white dark:bg-[#18201c] shrink-0 relative z-[3] ${conversation.isReadOnly ? 'is-disabled bg-[#f8faf7] dark:bg-[#18201c] opacity-80' : ''}`}>
        <div className="chat-input-box flex items-end gap-[10px] p-[6px_10px_6px_14px] border border-[#d4ded1] dark:border-[#2e3d35] rounded-[10px] bg-white dark:bg-[#151b18] transition-[border-color,box-shadow] duration-140 ease-in-out focus-within:border-[#193c33] dark:focus-within:border-[#4b6255] focus-within:shadow-[0_0_0_3px_rgba(25,60,51,0.08)] dark:focus-within:shadow-[0_0_0_3px_rgba(217,237,116,0.08)]">
          <textarea
            className="chat-textarea flex-1 min-h-[24px] max-h-[120px] py-[4px] border-none bg-transparent text-[#193c33] dark:text-[#e3ebe5] placeholder:text-[#97a499] text-[13.5px] font-[inherit] leading-[1.4] outline-none resize-none"
            rows={1}
            placeholder={
              conversation.isReadOnly
                ? 'Messaging is disabled for this conversation'
                : isDisconnected
                ? 'Connecting to chat...'
                : `Message ${conversation.otherUser.fullName}...`
            }
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={conversation.isReadOnly || isDisconnected || sending}
            maxLength={2000}
            aria-label="Write a message"
          />

          <div className="chat-input-actions flex items-center gap-[8px] mb-[2px]">
            <span
              className={`chat-char-counter text-[11px] text-[#9aa89d] font-mono ${inputValue.length > 1800 ? 'counter-warning text-[#d97706] font-semibold' : ''}`}
              title="Character count"
            >
              {inputValue.length}/2000
            </span>

            <button
              type="button"
              className="chat-send-btn grid place-items-center w-[34px] h-[34px] rounded-[7px] border-none bg-[#193c33] dark:bg-[#d9ed74] text-white dark:text-[#193c33] cursor-pointer transition-all duration-140 ease-in-out hover:not-disabled:bg-[#255448] dark:hover:not-disabled:bg-[#e5f79b] hover:not-disabled:text-[#d9ed74] dark:hover:not-disabled:text-[#193c33] disabled:bg-[#d8e0d6] dark:disabled:bg-[#27342d] disabled:text-[#9aa89d] dark:disabled:text-[#5e7166] disabled:cursor-not-allowed"
              onClick={handleSend}
              disabled={!inputValue.trim() || sending || conversation.isReadOnly || isDisconnected}
              aria-label="Send message"
              title="Send (Enter)"
            >
              {sending ? <Loader2 className="chat-spinner animate-spin" size={16} /> : <Send size={16} />}
            </button>
          </div>
        </div>
        <div className="chat-input-hint mt-[6px] text-[11px] text-[#8c988e] text-right">
          <span>Press <strong>Enter</strong> to send, <strong>Shift + Enter</strong> for new line</span>
        </div>
      </div>
    </div>
  )
}
