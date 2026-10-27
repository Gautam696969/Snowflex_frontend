import { useEffect, useMemo, useRef, useState } from 'react'
import { Bot, Mic, MessageSquarePlus, MessagesSquare, Search, SendHorizontal, Sparkles, Trash2, X, Square } from 'lucide-react'
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
import UserAvatar from './UserAvatar'
import { SkeletonConversationHistory, SkeletonMessageBubbles } from './Skeleton'
import { useTheme } from '../lib/theme'

const MAX_MESSAGE_LENGTH = 4000

const starterPrompts = [
  'Who is on leave today?',
  'Summarise all assigned tasks',
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
  userName: string
  avatarUrl?: string | null
}

export default function AiAssistant({ token, onError, userName, avatarUrl }: AiAssistantProps) {
  const { theme } = useTheme()
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
    <section className="ai-panel relative md:relative grid w-full h-[calc(100dvh-120px)] sm:h-[min(820px,calc(100dvh-150px))] min-h-[560px] sm:min-h-[620px] overflow-hidden grid-cols-1 min-[901px]:grid-cols-[216px_minmax(0,1fr)] min-[1101px]:grid-cols-[262px_minmax(0,1fr)] border border-[#e2e8df] dark:border-[#354239] rounded-[6px] bg-white dark:bg-[#1b241f] shadow-[0_2px_7px_rgba(31,54,39,0.025)] dark:shadow-[0_8px_28px_rgba(0,0,0,0.18)]">
      <aside className={`ai-history flex min-w-0 min-h-0 p-[15px_12px] flex-col gap-[12px] border-r border-[#e9ede7] dark:border-[#354239] bg-[#fafbf8] dark:bg-[#171f1a] max-[900px]:absolute max-[900px]:z-[3] max-[900px]:inset-y-0 max-[900px]:left-0 max-[900px]:w-[min(280px,82vw)] max-[900px]:shadow-[0_10px_24px_rgba(31,54,39,0.14)] max-[900px]:transition-transform max-[900px]:duration-220 ${historyVisible ? 'is-open max-[900px]:translate-x-0' : 'max-[900px]:-translate-x-[105%]'}`} aria-label="AI conversation history">
        <div className="ai-history-head flex items-center justify-between gap-[8px]">
          <span className="section-kicker text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#517154] dark:text-[#7f9f82]">HISTORY</span>
          <button className="secondary-action inline-flex items-center gap-[6px] min-h-[30px] px-[10px] py-0 rounded-[5px] border border-[#dce5d9] dark:border-[#354239] bg-white dark:bg-[#1f2b23] text-[#44594c] dark:text-[#c4d0c6] text-[10px] font-semibold hover:bg-[#f1f6ed] dark:hover:bg-[#27382d] cursor-pointer transition-colors" type="button" onClick={() => void startNewConversation()}>
            <MessageSquarePlus size={15} />New chat
          </button>
        </div>
        {loadingConversations ? (
          <SkeletonConversationHistory count={5} />
        ) : conversations.length === 0 ? (
          <p className="ai-history-empty my-[8px] mx-[2px] text-[#8a978e] dark:text-[#9caaa0] text-[11px] leading-[1.6]">No conversations yet. Start one to get help.</p>
        ) : filteredConversations.length === 0 ? (
          <p className="ai-history-empty my-[8px] mx-[2px] text-[#8a978e] dark:text-[#9caaa0] text-[11px] leading-[1.6]">No conversations match “{search}”</p>
        ) : (
          <ul className="ai-history-list grid min-h-0 overflow-y-auto m-0 p-0 flex-[1_1_auto] gap-[3px] list-none">
            {filteredConversations.map((conversation) => (
              <li key={conversation.id}>
                <button
                  type="button"
                  className={`ai-history-item group flex w-full items-center gap-[9px] p-[9px_10px] border-0 rounded-[5px] text-left cursor-pointer transition-all duration-140 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8aa357] ${conversation.id === activeId ? 'selected bg-[#eaf1e2] dark:bg-[#34422f] text-[#1f3c32] dark:text-[#e6f1cf]' : 'bg-transparent text-[#44594c] dark:text-[#c4d0c6] hover:bg-[#f0f4ec] dark:hover:bg-[#28342c] hover:text-[#243a33] dark:hover:text-[#f1f5ef]'}`}
                  onClick={() => { setActiveId(conversation.id); setMessages([]); setHistoryVisible(false) }}
                >
                  <MessagesSquare size={15} />
                  <span className="ai-history-copy grid min-w-0 gap-[2px] flex-1">
                    <strong className="overflow-hidden text-[11px] font-semibold text-ellipsis whitespace-nowrap text-inherit">{conversation.title}</strong>
                    <small className="text-[#97a49a] dark:text-[#9caaa0] text-[9px] font-['DM_Mono',monospace]">{formatTimestamp(conversation.updatedAt)}</small>
                  </span>
                  <span
                    className="ai-history-delete grid w-[24px] h-[24px] shrink-0 place-items-center rounded-[4px] text-[#9aa49c] opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-[#b83d32] hover:bg-[#fff1ee] dark:hover:bg-[#3d2420] transition-all duration-140 cursor-pointer"
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

      <div className="ai-thread grid min-w-0 min-h-0 grid-rows-[auto_minmax(0,1fr)_auto]">
        <header className="ai-thread-head flex min-w-0 min-h-[54px] sm:min-h-[62px] items-center max-[900px]:items-start max-[900px]:flex-wrap justify-between gap-[14px] p-[11px_13px] sm:p-[12px_18px] border-b border-[#e9ede7] dark:border-[#354239] bg-white dark:bg-[#1a231e]">
          <div className="ai-identity flex min-w-0 items-center gap-[11px] max-[900px]:flex-[1_1_220px]">
            <span className="ai-avatar grid shrink-0 place-items-center text-[#193c33] dark:text-[#1a241d] bg-[#d9ed74] w-[32px] h-[32px] rounded-[6px_6px_6px_2px]"><Sparkles size={15} /></span>
            <div className="grid min-w-0 gap-[2px]">
              <strong className="text-[#243a33] dark:text-[#e8efe9] font-bold text-[13px] font-['Manrope',sans-serif]">Snowflex AI Employee</strong>
              <small className="overflow-hidden text-[#8a978e] dark:text-[#9caaa0] text-[10px] text-ellipsis whitespace-nowrap">{activeConversation ? activeConversation.title : 'New conversation'}</small>
            </div>
          </div>
          <div className="ai-thread-actions flex min-w-0 flex-[0_1_auto] gap-[7px] flex-wrap justify-end max-[900px]:w-full max-[900px]:flex-[1_1_100%] max-[900px]:justify-start">
            <div className="ai-search relative flex items-center max-[900px]:min-w-0 max-[900px]:flex-[1_1_180px]">
              <Search size={14} className="ai-search-icon absolute left-[8px] text-[#9aa49c] pointer-events-none" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={searchRecording ? 'Listening…' : 'Search conversations…'}
                aria-label="Search conversations"
                className="w-[clamp(150px,22vw,280px)] focus:w-[clamp(180px,26vw,340px)] max-[900px]:w-full! min-h-[32px] pl-[30px] pr-[56px] py-0 border border-[#dfe5dc] dark:border-[#435148] rounded-[5px] text-[#293f34] dark:text-[#e8efe9] placeholder-[#a6b0a8] dark:placeholder-[#829187] bg-white dark:bg-[#141b17] text-[11px] outline-none focus:border-[#8aa357] focus:ring-3 focus:ring-[#8aa357]/16 transition-all duration-180"
              />
              {search && <button type="button" className="ai-search-clear absolute right-[30px] w-[20px] h-[20px] border-0 rounded-[4px] bg-transparent text-[#9aa49c] dark:text-[#a4b2a8] cursor-pointer grid place-items-center hover:text-[#b83d32] hover:bg-[#fff1ee] dark:hover:bg-[#3d2420] transition-colors" aria-label="Clear search" onClick={() => setSearch('')}><X size={13} /></button>}
              <button
                type="button"
                className={`ai-search-mic absolute right-[6px] w-[24px] h-[24px] border-0 rounded-[4px] cursor-pointer grid place-items-center transition-colors duration-140 disabled:opacity-40 disabled:cursor-not-allowed ${searchRecording ? 'is-recording text-[#b83d32] bg-[#fff5f3] animate-[mic-pulse_900ms_ease-in-out_infinite]' : 'bg-transparent text-[#9aa49c] dark:text-[#a4b2a8] hover:not-disabled:bg-[#eef3ec] dark:hover:not-disabled:bg-[#2a352e] hover:not-disabled:text-[#44594c] dark:hover:not-disabled:text-[#e8efe9]'}`}
                onClick={searchVoice.state === 'listening' ? searchVoice.handlers.stop : searchVoice.handlers.start}
                disabled={!searchVoice.supported || sending}
                title={searchRecording ? 'Stop recording' : searchVoice.supported ? 'Voice search' : 'Voice search unavailable'}
                aria-label={searchRecording ? 'Stop recording' : 'Voice search'}
              >
                <Mic size={13} />
              </button>
            </div>
            <button className="secondary-action ai-history-toggle hidden max-[900px]:inline-flex items-center gap-[6px] min-h-[32px] px-[11px] py-0 rounded-[5px] border border-[#dce5d9] dark:border-[#354239] bg-white dark:bg-[#1f2b23] text-[#44594c] dark:text-[#c4d0c6] text-[10px] font-semibold hover:bg-[#f1f6ed] dark:hover:bg-[#27382d] cursor-pointer transition-colors" type="button" onClick={() => setHistoryVisible((open) => !open)}>
              <MessagesSquare size={15} />History
            </button>
            <button className="secondary-action inline-flex items-center gap-[6px] min-h-[32px] px-[11px] py-0 rounded-[5px] border border-[#dce5d9] dark:border-[#354239] bg-white dark:bg-[#1f2b23] text-[#44594c] dark:text-[#c4d0c6] text-[10px] font-semibold hover:bg-[#f1f6ed] dark:hover:bg-[#27382d] cursor-pointer transition-colors" type="button" onClick={() => void startNewConversation()}>
              <MessageSquarePlus size={15} />New chat
            </button>
          </div>
        </header>

        <div className="ai-messages flex min-h-0 overflow-y-auto p-[16px_13px] sm:p-[20px_18px] flex-col gap-[13px] sm:gap-[16px] scroll-smooth" ref={scrollRef} role="log" aria-live="polite" aria-busy={sending}>
          {showEmptyState && (
            <div className="ai-welcome grid max-w-[560px] m-auto justify-items-center gap-[9px] text-center animate-[slide-up_220ms_ease_both]">
              <span className="ai-welcome-mark grid w-[46px] h-[46px] shrink-0 place-items-center rounded-[10px_10px_10px_3px] text-[#193c33] bg-[#d9ed74]"><Bot size={22} /></span>
              <h2 className="m-0 mt-[6px] text-[#243a33] dark:text-[#e8efe9] font-bold text-[17px] sm:text-[19px] font-['Manrope',sans-serif]">Ask about your people data</h2>
              <p className="m-0 text-[#7d8980] dark:text-[#9caaa0] text-[12px] leading-[1.65]">I can summarise leave balances, attendance trends and team rosters, or draft requests and announcements for you.</p>
              <div className="ai-suggestions flex flex-wrap justify-center gap-[7px] mt-[12px]">
                {starterPrompts.map((prompt) => (
                  <button key={prompt} type="button" className="ai-suggestion px-[11px] py-[7px] border border-[#dfe8d8] dark:border-[#435148] rounded-[20px] text-[#3f5a49] dark:text-[#d0ddd2] bg-[#fafcf7] dark:bg-[#222d26] text-[11px] cursor-pointer hover:border-[#8aa357] dark:hover:border-[#9aaf64] hover:text-[#243a33] dark:hover:text-[#f1f5ef] hover:bg-[#eff5e8] dark:hover:bg-[#303d31] transition-all duration-140 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8aa357]" onClick={() => void submit(prompt)}>{prompt}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <article key={message.id} className={`ai-bubble flex max-w-[94%] sm:max-w-[88%] gap-[10px] ${message.role === 'user' ? 'user ml-auto flex-row-reverse' : 'assistant'}`}>
              {message.role === 'user'
                ? <UserAvatar name={userName} avatarUrl={avatarUrl} size={27} className="ai-bubble-avatar rounded-[5px]" />
                : <span className="ai-bubble-avatar grid w-[27px] h-[27px] shrink-0 place-items-center rounded-[5px] text-[#193c33] dark:text-[#1a241d] bg-[#d9ed74]"><Sparkles size={14} /></span>}
              <div className={`ai-bubble-body grid min-w-0 gap-[6px] ${message.role === 'user' ? 'justify-items-end' : ''}`}>
                <div className={`ai-bubble-content p-[11px_13px] text-[12px] leading-[1.62] [overflow-wrap:anywhere] ${message.role === 'user' ? 'border border-[#193c33] dark:border-[#385446] rounded-[6px_6px_2px_6px] text-[#f2f6f1] dark:text-[#f0f5ef] bg-[#193c33] dark:bg-[#294538]' : 'border border-[#e6ece2] dark:border-[#39463d] rounded-[6px_6px_6px_2px] text-[#374c40] dark:text-[#d4ded5] bg-[#fbfcf9] dark:bg-[#222c26]'}`}>{renderMarkdown(message.content)}</div>
                <small className="ai-bubble-meta text-[#9aa49c] dark:text-[#9caaa0] text-[9px] font-['DM_Mono',monospace]">
                  {message.role === 'assistant' ? 'Snowflex AI Employee' : 'You'}
                  {message.createdAt ? ` · ${formatClock(message.createdAt)}` : ''}
                  {message.model ? ` · ${message.model}` : ''}
                  {message.role === 'user' && message.status === 'error' && ' · Failed'}
                </small>
                {message.role === 'user' && message.status === 'error' && (
                  <button type="button" className="ai-retry mt-[8px] border-0 bg-transparent text-[#b83d32] font-semibold text-[10px] font-['DM_Mono',monospace] uppercase tracking-[0.04em] cursor-pointer hover:underline" onClick={() => void submit(message.content)}>Retry</button>
                )}
              </div>
            </article>
          ))}

          {loadingMessages && <SkeletonMessageBubbles count={2} />}

          {sending && (
            <article className="ai-bubble assistant flex max-w-[94%] sm:max-w-[88%] gap-[10px]">
              <span className="ai-bubble-avatar grid w-[27px] h-[27px] shrink-0 place-items-center rounded-[5px] text-[#193c33] dark:text-[#1a241d] bg-[#d9ed74]"><Sparkles size={14} /></span>
              <div className="ai-bubble-body grid min-w-0 gap-[6px]">
                <span className="ai-typing inline-flex items-center gap-[4px] p-[13px_15px] border border-[#e6ece2] dark:border-[#39463d] rounded-[6px_6px_6px_2px] bg-[#fbfcf9] dark:bg-[#222c26]"><i className="w-[5px] h-[5px] rounded-full bg-[#8aa357] animate-[typing_1.1s_ease-in-out_infinite]" /><i className="w-[5px] h-[5px] rounded-full bg-[#8aa357] animate-[typing_1.1s_ease-in-out_infinite] [animation-delay:140ms]" /><i className="w-[5px] h-[5px] rounded-full bg-[#8aa357] animate-[typing_1.1s_ease-in-out_infinite] [animation-delay:280ms]" /></span>
              </div>
            </article>
          )}
        </div>

        <form
          className="ai-composer min-w-0 p-[12px_14px_13px] border-t border-[#e9ede7] dark:border-[#354239] bg-[#fafbf8] dark:bg-[#1a231e]"
          onSubmit={(event) => { event.preventDefault(); void submit(draft) }}
        >
          <div className="ai-composer-box flex items-end gap-[8px] p-[8px_8px_8px_14px] border border-[#dfe5dc] dark:border-[#435148] rounded-[14px] bg-white dark:bg-[#141b17] focus-within:border-[#8aa357] dark:focus-within:border-[#a2b76c] focus-within:ring-3 focus-within:ring-[#8aa357]/16 transition-all duration-140">
            {voice.error && (
              <small className="ai-voice-error flex flex-[1_0_100%] items-center gap-[8px] flex-wrap text-[#b83d32] text-[10px] p-[6px_14px] border-t border-[#fff1ee] bg-[#fffaf8]" role="alert">
                {voice.error}
                <button type="button" className="ai-voice-retry border-0 bg-transparent text-[#b83d32] font-bold text-[10px] font-['DM_Mono',monospace] uppercase tracking-[0.04em] cursor-pointer hover:underline" onClick={() => voice.handlers.start()}>Retry</button>
              </small>
            )}
            {voice.state === 'listening' ? (
              <>
                <div className="ai-voice-ui flex flex-col gap-[6px] py-[4px] px-0">
                  <Waveform analyserRef={voice.analyserRef} active={voice.state === 'listening'} color={theme === 'dark' ? '#d9ed74' : '#2f4a3f'} />
                  {voice.transcript && <small className="ai-voice-transcript text-[#617166] text-[11px] leading-[1.5] max-w-[70%]">{voice.transcript}</small>}
                </div>
                <button
                  type="button"
                  className="ai-action-btn is-stop shrink-0 w-[36px] h-[36px] border-0 rounded-[10px] cursor-pointer grid place-items-center bg-[#2f4a3f] text-white dark:bg-[#d9ed74] dark:text-[#1a241d] hover:not-disabled:bg-[#243a33] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-140"
                  onClick={voice.handlers.stop}
                  aria-label="Stop and confirm"
                  title="Stop and confirm"
                >
                  <Square size={16} fill="currentColor" />
                </button>
                <button
                  type="button"
                  className="ai-action-btn is-cancel shrink-0 w-[36px] h-[36px] border-0 rounded-[10px] cursor-pointer grid place-items-center bg-transparent text-[#8a978e] hover:not-disabled:bg-[#eef3ec] dark:hover:not-disabled:bg-[#2a352e] hover:not-disabled:text-[#44594c] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-140"
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
                  className="flex-1 min-h-[24px] max-h-[160px] py-[4px] px-0 border-0 outline-none resize-none bg-transparent text-[#293f34] dark:text-[#edf2ec] placeholder-[#a6b0a8] dark:placeholder-[#829187] text-[13px] leading-[1.55] disabled:cursor-wait disabled:opacity-65"
                />
                {trimmedDraft.length > 0 ? (
                  <button
                    type="submit"
                    className="ai-action-btn is-send shrink-0 w-[36px] h-[36px] border-0 rounded-[10px] cursor-pointer grid place-items-center bg-[#2f4a3f] text-white dark:bg-[#d9ed74] dark:text-[#1a241d] hover:not-disabled:bg-[#243a33] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-140"
                    disabled={!canSend}
                    aria-label="Send"
                    title="Send"
                  >
                    <SendHorizontal size={18} />
                  </button>
                ) : (
                  <button
                    type="button"
                    className={`ai-action-btn is-mic shrink-0 w-[36px] h-[36px] border-0 rounded-[10px] cursor-pointer grid place-items-center transition-all duration-140 disabled:opacity-40 disabled:cursor-not-allowed ${recording ? 'is-recording text-[#b83d32] bg-[#fff5f3] animate-[mic-pulse_900ms_ease-in-out_infinite]' : 'bg-transparent text-[#44594c] dark:text-[#a4b2a8] hover:not-disabled:bg-[#eef3ec] dark:hover:not-disabled:bg-[#2a352e] hover:not-disabled:text-[#243a33]'}`}
                    onClick={voice.handlers.start}
                    disabled={!supported || sending || voice.state === 'processing'}
                    title={recording ? 'Stop recording' : supported ? 'Voice input' : 'Voice input unavailable'}
                    aria-label={recording ? 'Stop recording' : 'Voice input'}
                  >
                    <Mic size={18} />
                  </button>
                )}
                {draft.length > 3000 && <small className="ai-counter shrink-0 self-end mr-[8px] my-0 ml-0 text-[#9aa49c] dark:text-[#9caaa0] text-[9px] font-['DM_Mono',monospace]">{draft.length}/{MAX_MESSAGE_LENGTH}</small>}
              </>
            )}
          </div>
        </form>
      </div>

      {pendingDelete && (
        <div className="modal-overlay fixed inset-0 bg-[#0e1b15]/60 backdrop-blur-[4px] z-[999] grid place-items-center p-[16px] animate-[fadeIn_0.15s_ease]" onClick={() => setPendingDelete(null)} role="dialog" aria-modal="true" aria-labelledby="ai-delete-title">
          <div className="modal w-full max-w-[440px] bg-white dark:bg-[#14211a] border border-[#e2e8df] dark:border-[#223329] rounded-[12px] p-[24px] shadow-2xl animate-[fadeIn_0.15s_ease]" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header flex items-center justify-between pb-[14px] border-b border-[#edf2ea] dark:border-[#223329]">
              <h3 id="ai-delete-title" className="m-0 text-[17px] font-bold text-[#193c33] dark:text-[#e5efe8]">Delete conversation</h3>
              <button className="modal-close w-[32px] h-[32px] rounded-[6px] grid place-items-center text-[#758278] hover:bg-[#f0f4ee] dark:hover:bg-[#233129] cursor-pointer border-0 bg-transparent" type="button" onClick={() => setPendingDelete(null)} aria-label="Close"><Trash2 size={17} /></button>
            </div>
            <p className="modal-body my-[16px] mx-0 text-[13px] text-[#517154] dark:text-[#a4b2a8] leading-[1.5]">“{pendingDelete.title}” and all of its messages will be removed. This cannot be undone.</p>
            <div className="modal-footer flex items-center justify-end gap-[10px] pt-[14px] border-t border-[#edf2ea] dark:border-[#223329]">
              <button className="secondary-action px-[16px] py-[8px] border border-[#dce5d9] dark:border-[#2b3e33] rounded-[6px] bg-white dark:bg-[#192720] text-[#4b5e52] dark:text-[#dbe7df] text-[12px] font-semibold cursor-pointer hover:bg-[#eef4eb] dark:hover:bg-[#24352b]" type="button" onClick={() => setPendingDelete(null)}>Cancel</button>
              <button className="primary-action px-[16px] py-[8px] border border-[#dc2626] rounded-[6px] bg-[#dc2626] text-white text-[12px] font-semibold cursor-pointer hover:bg-[#b91c1c]" type="button" onClick={() => void confirmDelete()}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
