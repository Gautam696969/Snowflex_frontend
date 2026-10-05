import { useEffect, useMemo, useRef, useState } from 'react'
import { Bot, Mic, MessageSquarePlus, MessagesSquare, Search, SendHorizontal, Sparkles, Trash2, User, X, Square } from 'lucide-react'
import { useVoiceInput } from '../hooks/useVoiceInput'
import Waveform from './Waveform'
import {
  createAiConversation,
  deleteAiConversation,
  listAiConversations,
  listAiMessages,
  sendAiMessage,
} from '../lib/auth-api'
import type { AiConversation, AiMessage } from '../lib/auth-api'
import { renderMarkdown } from '../lib/render-markdown'

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

interface AiAssistantProps {
  token: string
  onError: (message: string) => void
}

export default function AiAssistant({ token, onError }: AiAssistantProps) {
  const [conversations, setConversations] = useState<AiConversation[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [messages, setMessages] = useState<AiMessage[]>([])
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState('')
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<AiConversation | null>(null)
  const [historyVisible, setHistoryVisible] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const draftRef = useRef(draft)
  const searchRef = useRef(search)

  useEffect(() => { draftRef.current = draft }, [draft])
  useEffect(() => { searchRef.current = search }, [search])

  const voice = useVoiceInput(
    (text) => setDraft(text),
    undefined,
    { token, lang: 'en-IN' },
  )

  const searchVoice = useVoiceInput(
    (text) => setSearch(text),
    undefined,
    { token, lang: 'en-IN' },
  )

  useEffect(() => {
    if (voice.state === 'idle' && voice.transcript) textareaRef.current?.focus()
  }, [voice.state, voice.transcript])

  const recording = voice.state === 'listening'
  const searchRecording = searchVoice.state === 'listening'
  const supported = voice.supported

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

    const userMessageId = `user-${crypto.randomUUID()}`
    setDraft('')
    setSending(true)
    setMessages((current) => [
      ...current,
      {
        id: userMessageId,
        conversationId: activeId ?? -1,
        role: 'user',
        content,
        createdAt: new Date().toISOString(),
        status: 'sending',
      },
    ])

    try {
      const result = await sendAiMessage(token, activeId === null
        ? { source: 'ai-employee', message: content }
        : { source: 'ai-employee', message: content, conversationId: activeId })
      setConversations((current) => {
        const remaining = current.filter((conversation) => conversation.id !== result.conversation.id)
        return [result.conversation, ...remaining]
      })
      setActiveId(result.conversation.id)
      setMessages((current) => [
        ...current.map((message) =>
          message.id === userMessageId ? { ...message, status: 'sent' as const } : message,
        ),
        { ...result.message, id: `ai-${result.message.id}`, status: 'sent' as const },
      ])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The assistant could not respond.'
      onError(message)
      setMessages((current) =>
        current.map((msg) =>
          msg.id === userMessageId ? { ...msg, status: 'error' as const } : msg,
        ),
      )
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
  const canSend = trimmedDraft.length > 0 && trimmedDraft.length <= MAX_MESSAGE_LENGTH && !sending && voice.state !== 'processing'
  const showEmptyState = messages.length === 0 && !loadingMessages && !sending
  const query = search.trim().toLowerCase()
  const filteredConversations = useMemo(() => {
    if (!query) return conversations
    return conversations.filter((conversation) => conversation.title.toLowerCase().includes(query))
  }, [conversations, query])

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
        ) : filteredConversations.length === 0 ? (
          <p className="ai-history-empty">No conversations match “{search}”</p>
        ) : (
          <ul className="ai-history-list">
            {filteredConversations.map((conversation) => (
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
<div className="ai-search">
            <Search size={14} className="ai-search-icon" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={searchRecording ? 'Listening…' : 'Search conversations…'}
              aria-label="Search conversations"
            />
            {search && <button type="button" className="ai-search-clear" aria-label="Clear search" onClick={() => setSearch('')}><X size={13} /></button>}
            <button
              type="button"
              className={`ai-search-mic ${searchRecording ? 'is-recording' : ''}`}
              onClick={searchVoice.state === 'listening' ? searchVoice.handlers.stop : searchVoice.handlers.start}
              disabled={!searchVoice.supported || sending}
              title={searchRecording ? 'Stop recording' : searchVoice.supported ? 'Voice search' : 'Voice search unavailable'}
              aria-label={searchRecording ? 'Stop recording' : 'Voice search'}
            >
              <Mic size={13} />
            </button>
          </div>
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
                  {message.role === 'user' && message.status === 'error' && ' · Failed'}
                </small>
                {message.role === 'user' && message.status === 'error' && (
                  <button type="button" className="ai-retry" onClick={() => void submit(message.content)}>Retry</button>
                )}
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
          <div className="ai-composer-box">
            {voice.error && (
              <small className="ai-voice-error" role="alert">
                {voice.error}
                <button type="button" className="ai-voice-retry" onClick={() => voice.handlers.start()}>Retry</button>
              </small>
            )}
            {voice.state === 'listening' ? (
              <>
                <div className="ai-voice-ui">
                  <Waveform analyserRef={voice.analyserRef} active={voice.state === 'listening'} color="#2f4a3f" />
                  {voice.transcript && <small className="ai-voice-transcript">{voice.transcript}</small>}
                </div>
                <button
                  type="button"
                  className="ai-action-btn is-stop"
                  onClick={voice.handlers.stop}
                  aria-label="Stop and confirm"
                  title="Stop and confirm"
                >
                  <Square size={16} fill="#2f4a3f" />
                </button>
                <button
                  type="button"
                  className="ai-action-btn is-cancel"
                  onClick={voice.handlers.cancel}
                  aria-label="Cancel"
                  title="Cancel"
                >
                  <X size={16} />
                </button>
              </>
            ) : (
              <>
                <textarea
                  ref={textareaRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  disabled={voice.state === 'processing'}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      void submit(draft)
                    }
                  }}
                  rows={2}
                  maxLength={MAX_MESSAGE_LENGTH}
                  placeholder={voice.state === 'processing' ? 'Processing…' : supported ? 'Type a message or tap the mic' : 'Ask about attendance, leave, teams or tasks…'}
                  aria-label="Message the Snowflex AI Employee"
                />
                {trimmedDraft.length > 0 ? (
                  <button
                    type="submit"
                    className="ai-action-btn is-send"
                    disabled={!canSend}
                    aria-label="Send"
                    title="Send"
                  >
                    <SendHorizontal size={18} />
                  </button>
                ) : (
                  <button
                    type="button"
                    className={`ai-action-btn is-mic ${recording ? 'is-recording' : ''}`}
                    onClick={voice.handlers.start}
                    disabled={!supported || sending || voice.state === 'processing'}
                    title={recording ? 'Stop recording' : supported ? 'Voice input' : 'Voice input unavailable'}
                    aria-label={recording ? 'Stop recording' : 'Voice input'}
                  >
                    <Mic size={18} />
                  </button>
                )}
                {draft.length > 3000 && <small className="ai-counter">{draft.length}/{MAX_MESSAGE_LENGTH}</small>}
              </>
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
