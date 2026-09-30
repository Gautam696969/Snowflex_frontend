import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Bot, MessageSquarePlus, MessagesSquare, Send, Sparkles, Trash2, User } from 'lucide-react'
import {
  createAiConversation,
  deleteAiConversation,
  listAiConversations,
  listAiMessages,
  sendAiMessage,
} from '../lib/auth-api'
import type { AiConversation, AiMessage } from '../lib/auth-api'

const MAX_MESSAGE_LENGTH = 4000

const starterPrompts = [
  'Who is on leave today?',
  'Summarise my open tasks',
  'Draft a leave request for next Friday',
  'How many employees are active right now?',
]

function formatTimestamp(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatClock(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g
  let cursor = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index))
    const token = match[0]
    if (token.startsWith('**')) {
      nodes.push(<strong key={`${keyPrefix}-b${cursor}`}>{token.slice(2, -2)}</strong>)
    } else {
      nodes.push(<code key={`${keyPrefix}-c${cursor}`}>{token.slice(1, -1)}</code>)
    }
    cursor = match.index + token.length
  }
  if (cursor < text.length) nodes.push(text.slice(cursor))
  return nodes
}

function renderMarkdown(content: string): ReactNode[] {
  const blocks: ReactNode[] = []
  const lines = content.split('\n')
  let listBuffer: string[] = []

  const flushList = () => {
    if (listBuffer.length === 0) return
    const items = listBuffer.map((item, index) => (
      <li key={`li-${index}`}>{renderInline(item, `li-${index}`)}</li>
    ))
    blocks.push(<ul key={`ul-${blocks.length}`}>{items}</ul>)
    listBuffer = []
  }

  lines.forEach((line, index) => {
    const trimmed = line.trim()
    if (/^[-*]\s+/.test(trimmed)) {
      listBuffer.push(trimmed.replace(/^[-*]\s+/, ''))
      return
    }
    flushList()
    if (!trimmed) return
    if (/^#{1,3}\s+/.test(trimmed)) {
      blocks.push(<h4 key={`h-${index}`}>{renderInline(trimmed.replace(/^#{1,3}\s+/, ''), `h-${index}`)}</h4>)
      return
    }
    blocks.push(<p key={`p-${index}`}>{renderInline(trimmed, `p-${index}`)}</p>)
  })
  flushList()
  return blocks
}

interface AiAssistantProps {
  token: string
  onError: (message: string) => void
}

export default function AiAssistant({ token, onError }: AiAssistantProps) {
  const [conversations, setConversations] = useState<AiConversation[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [messages, setMessages] = useState<AiMessage[]>([])
  const [draft, setDraft] = useState('')
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<AiConversation | null>(null)
  const [historyVisible, setHistoryVisible] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId) ?? null,
    [conversations, activeId],
  )

  useEffect(() => {
    let cancelled = false
    listAiConversations(token)
      .then((result) => {
        if (cancelled) return
        setConversations(result)
        setActiveId((current) => current ?? result[0]?.id ?? null)
      })
      .catch((error) => {
        if (cancelled) return
        onError(error instanceof Error ? error.message : 'Unable to load AI conversations.')
      })
      .finally(() => {
        if (!cancelled) setLoadingConversations(false)
      })
    return () => { cancelled = true }
  }, [token, onError])

  useEffect(() => {
    if (activeId === null) return
    let cancelled = false
    setLoadingMessages(true)
    listAiMessages(token, activeId)
      .then((result) => { if (!cancelled) setMessages(result) })
      .catch((error) => {
        if (cancelled) return
        onError(error instanceof Error ? error.message : 'Unable to load this conversation.')
      })
      .finally(() => { if (!cancelled) setLoadingMessages(false) })
    return () => { cancelled = true }
  }, [token, activeId, onError])

  useEffect(() => {
    const node = scrollRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [messages, sending])

  const startNewConversation = async () => {
    try {
      const created = await createAiConversation(token)
      setConversations((current) => [created, ...current])
      setActiveId(created.id)
      setMessages([])
      setHistoryVisible(false)
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unable to start a new conversation.')
    }
  }

  async function submit(text: string) {
    const content = text.trim()
    if (!content || sending) return

    setDraft('')
    setSending(true)
    setMessages((current) => [
      ...current,
      {
        id: -Date.now(),
        conversationId: activeId ?? -1,
        role: 'user',
        content,
        createdAt: new Date().toISOString(),
      },
    ])

    try {
      const result = await sendAiMessage(token, activeId === null ? { message: content } : { message: content, conversationId: activeId })
      setConversations((current) => {
        const remaining = current.filter((conversation) => conversation.id !== result.conversation.id)
        return [result.conversation, ...remaining]
      })
      setActiveId(result.conversation.id)
      setMessages((current) => [
        ...current.filter((message) => message.id > 0 || message.role === 'assistant'),
        result.message,
      ])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The assistant could not respond.'
      onError(message)
      setMessages((current) => [...current, { id: -Date.now() - 1, conversationId: activeId ?? -1, role: 'assistant', content: message, createdAt: new Date().toISOString() }])
    } finally {
      setSending(false)
    }
  }

  async function confirmDelete() {
    const target = pendingDelete
    setPendingDelete(null)
    if (!target) return
    try {
      await deleteAiConversation(token, target.id)
      const remaining = conversations.filter((conversation) => conversation.id !== target.id)
      setConversations(remaining)
      if (activeId === target.id) {
        setActiveId(remaining[0]?.id ?? null)
        setMessages([])
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unable to delete the conversation.')
    }
  }

  const trimmedDraft = draft.trim()
  const canSend = trimmedDraft.length > 0 && trimmedDraft.length <= MAX_MESSAGE_LENGTH && !sending
  const showEmptyState = messages.length === 0 && !loadingMessages && !sending

  return (
    <section className="ai-panel">
      <aside className={historyVisible ? 'ai-history is-open' : 'ai-history'} aria-label="AI conversation history">
        <div className="ai-history-head">
          <span className="section-kicker">HISTORY</span>
          <button className="secondary-action" type="button" onClick={() => void startNewConversation()}>
            <MessageSquarePlus size={15} />New chat
          </button>
        </div>
        {loadingConversations ? (
          <p className="ai-history-empty">Loading conversations…</p>
        ) : conversations.length === 0 ? (
          <p className="ai-history-empty">No conversations yet. Start one to get help.</p>
        ) : (
          <ul className="ai-history-list">
            {conversations.map((conversation) => (
              <li key={conversation.id}>
                <button
                  type="button"
                  className={conversation.id === activeId ? 'ai-history-item selected' : 'ai-history-item'}
                  onClick={() => { setActiveId(conversation.id); setMessages([]); setHistoryVisible(false) }}
                >
                  <MessagesSquare size={15} />
                  <span className="ai-history-copy">
                    <strong>{conversation.title}</strong>
                    <small>{formatTimestamp(conversation.updatedAt)}</small>
                  </span>
                  <span
                    className="ai-history-delete"
                    role="button"
                    tabIndex={0}
                    aria-label={`Delete ${conversation.title}`}
                    title="Delete conversation"
                    onClick={(event) => { event.stopPropagation(); setPendingDelete(conversation) }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        event.stopPropagation()
                        setPendingDelete(conversation)
                      }
                    }}
                  >
                    <Trash2 size={14} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <div className="ai-thread">
        <header className="ai-thread-head">
          <div className="ai-identity">
            <span className="ai-avatar"><Sparkles size={15} /></span>
            <div>
              <strong>Snowflex AI Employee</strong>
              <small>{activeConversation ? activeConversation.title : 'New conversation'}</small>
            </div>
          </div>
          <div className="ai-thread-actions">
            <button className="secondary-action ai-history-toggle" type="button" onClick={() => setHistoryVisible((open) => !open)}>
              <MessagesSquare size={15} />History
            </button>
            <button className="secondary-action" type="button" onClick={() => void startNewConversation()}>
              <MessageSquarePlus size={15} />New chat
            </button>
          </div>
        </header>

        <div className="ai-messages" ref={scrollRef} role="log" aria-live="polite" aria-busy={sending}>
          {showEmptyState && (
            <div className="ai-welcome">
              <span className="ai-welcome-mark"><Bot size={22} /></span>
              <h2>Ask about your people data</h2>
              <p>I can summarise leave balances, attendance trends and team rosters, or draft requests and announcements for you.</p>
              <div className="ai-suggestions">
                {starterPrompts.map((prompt) => (
                  <button key={prompt} type="button" className="ai-suggestion" onClick={() => void submit(prompt)}>{prompt}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <article key={message.id} className={message.role === 'user' ? 'ai-bubble user' : 'ai-bubble assistant'}>
              <span className="ai-bubble-avatar">{message.role === 'user' ? <User size={14} /> : <Sparkles size={14} />}</span>
              <div className="ai-bubble-body">
                <div className="ai-bubble-content">{renderMarkdown(message.content)}</div>
                <small className="ai-bubble-meta">
                  {message.role === 'assistant' ? 'Snowflex AI Employee' : 'You'}
                  {message.createdAt ? ` · ${formatClock(message.createdAt)}` : ''}
                  {message.model ? ` · ${message.model}` : ''}
                </small>
              </div>
            </article>
          ))}

          {loadingMessages && <p className="ai-history-empty">Loading conversation…</p>}

          {sending && (
            <article className="ai-bubble assistant">
              <span className="ai-bubble-avatar"><Sparkles size={14} /></span>
              <div className="ai-bubble-body">
                <span className="ai-typing"><i /><i /><i /></span>
              </div>
            </article>
          )}
        </div>

        <form
          className="ai-composer"
          onSubmit={(event) => { event.preventDefault(); void submit(draft) }}
        >
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void submit(draft)
              }
            }}
            rows={2}
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder="Ask about attendance, leave, teams or tasks…"
            aria-label="Message the Snowflex AI Employee"
          />
          <div className="ai-composer-foot">
            <small>{draft.length}/{MAX_MESSAGE_LENGTH}</small>
            {sending ? (
              <span className="primary-action is-busy" aria-live="polite"><span className="spinner" />Thinking</span>
            ) : (
              <button className="primary-action" type="submit" disabled={!canSend}>
                <Send size={14} />Send
              </button>
            )}
          </div>
        </form>
      </div>

      {pendingDelete && (
        <div className="modal-overlay" onClick={() => setPendingDelete(null)} role="dialog" aria-modal="true" aria-labelledby="ai-delete-title">
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3 id="ai-delete-title">Delete conversation</h3>
              <button className="modal-close" type="button" onClick={() => setPendingDelete(null)} aria-label="Close"><Trash2 size={17} /></button>
            </div>
            <p className="modal-body">“{pendingDelete.title}” and all of its messages will be removed. This cannot be undone.</p>
            <div className="modal-footer">
              <button className="secondary-action" type="button" onClick={() => setPendingDelete(null)}>Cancel</button>
              <button className="primary-action" type="button" onClick={() => void confirmDelete()}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
