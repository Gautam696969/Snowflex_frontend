import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { RotateCcw, Send, Sparkles, X } from 'lucide-react'
import { apiBase } from '../lib/api-config'

export interface DemoChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  timestamp: string
}

interface SnowflexChatDemoProps {
  isOpen: boolean
  onClose: () => void
  returnFocusTo?: React.RefObject<HTMLButtonElement | null>
}

const GREETING_TEXT =
  "Hii buddy! 👋 I'm Snowflex AI. How's your day going? I can help with attendance, shifts, leave, chat, video calls & meetings. What would you like to try?"

const QUICK_REPLIES = [
  'Who is on leave today?',
  "Show today's attendance",
  'When is my next shift?',
  'How do chat & video meetings work?',
  'Tell me about Snowflex',
]

function formatNow(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function localFallbackReply(message: string): string {
  const q = message.toLowerCase().trim()
  const isHinglish = /\b(kya|hai|hain|kaise|kab|kaun|chutti|mera|meri|aaj|kal|batao|bata|karo|naam|bhai|yaar|theek|haan|nahi)\b/.test(q)

  if (q.includes('leave') || q.includes('chutti') || q.includes('holiday') || q.includes('vacation') || q.includes('absent')) {
    return isHinglish
      ? 'Aaj 2 teammates leave par hain (demo data): Priya Sharma (Sick Leave) aur Rohan Mehta (Casual Leave), aur 1 request pending hai. 📋'
      : 'Today 2 teammates are on leave (demo data): Priya Sharma (Sick Leave) and Rohan Mehta (Casual Leave), with 1 request pending approval. 📋'
  }
  if (q.includes('attendance') || q.includes('selfie') || q.includes('check-in') || q.includes('checkin') || q.includes('late') || q.includes('present')) {
    return isHinglish
      ? 'Aaj ki attendance 94% hai (demo data): 47/50 employees ne selfie check-in kiya hai, aur 2 thoda late aaye. 📸'
      : "Today's attendance is 94% (demo data): 47 of 50 employees checked in with verified selfies, and 2 arrived slightly late. 📸"
  }
  if (q.includes('shift') || q.includes('timing') || q.includes('schedule') || q.includes('roster')) {
    return isHinglish
      ? 'Aapki next shift kal 09:00 AM – 06:00 PM IST hai (demo data). Snowflex check-in aur check-out se 5 min pehle push reminder bhejta hai! ⏰'
      : 'Your next shift is tomorrow 09:00 AM – 06:00 PM IST (demo data). Snowflex sends a push reminder 5 minutes before check-in and check-out! ⏰'
  }
  if (q.includes('report') || q.includes('analytics') || q.includes('export') || q.includes('summary') || q.includes('csv') || q.includes('pdf')) {
    return isHinglish
      ? 'Aap attendance, late arrivals aur leave trends ke instant reports ek click me export kar sakte hain (demo data)! 📊'
      : 'You can generate instant attendance, late-arrival, and leave-summary reports in one click and export them anytime (demo data)! 📊'
  }
  if (q.includes('notification') || q.includes('reminder') || q.includes('alert') || q.includes('push')) {
    return isHinglish
      ? 'Snowflex shift start aur end se 5 minute pehle smart push notifications bhejta hai — app band ho tab bhi! 🔔'
      : 'Snowflex sends smart push reminders 5 minutes before shift start and end — even when the app is closed! 🔔'
  }
  if ((q.includes('chat') || q.includes('messag') || q.includes('dm')) && (q.includes('video') || q.includes('call') || q.includes('meet'))) {
    return isHinglish
      ? 'Snowflex me Live Team Chat, 1-on-1 HD Video Calls, aur Group Meetings (screen sharing, raise hand & meeting links ke saath) sab built-in hain! 💬📹'
      : 'Snowflex includes Live Team Chat, 1-on-1 HD Video Calls, and Group Meetings with screen sharing, raise hand, and instant join links — all built-in! 💬📹'
  }
  if (q.includes('meeting') || q.includes('meet') || q.includes('screen shar') || q.includes('screenshar') || q.includes('raise hand')) {
    return isHinglish
      ? 'Snowflex Meetings me aap instant ya scheduled meeting start kar sakte hain, chat me direct join link bhej sakte hain, screen share kar sakte hain, aur host sabke liye End-for-All kar sakta hai! 🎥🖥️'
      : 'With Snowflex Meetings you can launch instant or scheduled rooms, share clickable meeting cards in chat, present your screen, raise hand, and host-manage participants! 🎥🖥️'
  }
  if (q.includes('video') || q.includes('call') || q.includes('ring') || q.includes('audio call')) {
    return isHinglish
      ? 'Snowflex me aap kisi bhi teammate ko direct 1-on-1 HD Video Call kar sakte hain — live ring notification, camera/mic toggle aur missed call alerts ke saath! 📞📹'
      : 'Snowflex supports direct 1-on-1 HD Video Calls right from chat — complete with live incoming call rings, mic/camera toggles, and missed call logs! 📞📹'
  }
  if (q.includes('chat') || q.includes('messag') || q.includes('dm') || q.includes('conversation')) {
    return isHinglish
      ? 'Snowflex Live Chat me real-time 1-on-1 aur group messaging, online status, unread counts, aur chat ke andar se hi call/meeting start karne ka option milta hai! 💬✨'
      : 'Snowflex Live Chat gives you real-time 1-on-1 and team messaging with online status, unread badges, and one-click video calls or meeting invites right inside chat! 💬✨'
  }
  if (q.includes('price') || q.includes('pricing') || q.includes('free') || q.includes('cost') || q.includes('plan') || q.includes('trial') || q.includes('signup')) {
    return isHinglish
      ? 'Aap free account banakar apni team ke saath Snowflex turant try kar sakte hain! 🚀 Top-right se Get Started par click karein.'
      : 'You can start using Snowflex for free with your team right away! 🚀 Click Get Started on the page to create your workspace.'
  }
  if (q.includes('theme') || q.includes('dark') || q.includes('light') || q.includes('mode')) {
    return isHinglish
      ? 'Snowflex dark aur light dono modes support karta hai — upar theme toggle se aap kabhi bhi switch kar sakte hain! 🌗'
      : 'Snowflex supports both dark and light modes seamlessly — you can switch anytime from the theme toggle! 🌗'
  }
  if (q.includes('about snowflex') || q.includes('snowflex') || q.includes('feature') || q.includes('kya karta')) {
    return isHinglish
      ? 'Snowflex ek all-in-one employee management PWA hai! ✨ Isme selfie attendance, 5-min shift reminders, leave approvals, team chat, video meetings aur AI assistant sab milta hai.'
      : 'Snowflex is an all-in-one employee management PWA! ✨ It includes selfie attendance, 5-min shift reminders, leave approvals, team chat, HD video meetings, and an AI assistant.'
  }
  if (/^(hi|hii|hey|hello|namaste|hola|yo)\b/.test(q)) {
    return isHinglish
      ? 'Hii buddy! 👋 Main Snowflex AI hoon. Attendance, shifts, leave ya reports ke baare me kuch bhi puchho!'
      : "Hii buddy! 👋 I'm Snowflex AI. Ask me anything about attendance, shifts, leave, or team reports!"
  }
  if (q.includes('thank') || q.includes('shukriya') || q.includes('dhanyawad')) {
    return isHinglish
      ? 'Most welcome! 😊 Kuch aur puchhna ho to zarur batayein.'
      : "You're very welcome! 😊 Let me know if you'd like to explore anything else in Snowflex."
  }

  const topicPreview = message.trim().slice(0, 45)
  return isHinglish
    ? `"${topicPreview}" ke baare me: Snowflex AI aapki team ki attendance, shifts, leave aur live chat ko automate karta hai (demo mode). ✨ Attendance, shift ya leave ke baare me puchh kar dekhein!`
    : `Great question about "${topicPreview}"! Snowflex helps teams automate attendance, shift reminders, leave approvals, and live collaboration (demo mode). ✨ Try asking about attendance, shifts, leaves, or video meetings!`
}

function isWakeupOrNetworkError(status: number | null, err: unknown): boolean {
  if (status === 502 || status === 503 || status === 504) return true
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err || '').toLowerCase()
  return (
    msg.includes('failed to fetch') ||
    msg.includes('network') ||
    msg.includes('load failed') ||
    msg.includes('abort') ||
    msg.includes('timeout')
  )
}

export default function SnowflexChatDemo({
  isOpen,
  onClose,
  returnFocusTo,
}: SnowflexChatDemoProps) {
  const [messages, setMessages] = useState<DemoChatMessage[]>([])
  const [hasGreeted, setHasGreeted] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [typingStatus, setTypingStatus] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [sessionId, setSessionId] = useState(() => `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)

  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const greetingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wasOpenRef = useRef(false)

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Auto-scroll to latest message
  useEffect(() => {
    if (!isOpen) return
    messagesEndRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    })
  }, [messages, isTyping, isOpen, prefersReducedMotion])

  // Auto-greeting once per session (1 second typing indicator)
  useEffect(() => {
    if (!isOpen || hasGreeted) return

    setIsTyping(true)
    setTypingStatus(null)
    greetingTimerRef.current = setTimeout(() => {
      setIsTyping(false)
      setMessages([
        {
          id: `greet-${Date.now()}`,
          role: 'assistant',
          text: GREETING_TEXT,
          timestamp: formatNow(),
        },
      ])
      setHasGreeted(true)
    }, prefersReducedMotion ? 150 : 1000)

    return () => {
      if (greetingTimerRef.current) {
        clearTimeout(greetingTimerRef.current)
        greetingTimerRef.current = null
      }
    }
  }, [isOpen, hasGreeted, prefersReducedMotion])

  // Body scroll lock on mobile + Escape key + Focus trap + Return focus on close
  useEffect(() => {
    if (!isOpen) {
      if (wasOpenRef.current) {
        wasOpenRef.current = false
        returnFocusTo?.current?.focus()
      }
      return
    }

    wasOpenRef.current = true
    const isMobile = window.innerWidth < 640
    const prevOverflow = document.body.style.overflow
    if (isMobile) {
      document.body.style.overflow = 'hidden'
    }

    const focusTimer = setTimeout(() => {
      inputRef.current?.focus()
    }, 60)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], textarea:not([disabled]), input:not([disabled])'
        )
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      clearTimeout(focusTimer)
      document.removeEventListener('keydown', handleKeyDown)
      if (isMobile) {
        document.body.style.overflow = prevOverflow
      }
    }
  }, [isOpen, onClose, returnFocusTo])

  const handleResetChat = () => {
    if (greetingTimerRef.current) clearTimeout(greetingTimerRef.current)
    setMessages([])
    setHasGreeted(false)
    setIsTyping(false)
    setTypingStatus(null)
    setInput('')
    setSessionId(`demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
  }

  const sendDemoMessage = async (rawText: string) => {
    const clean = rawText.trim()
    if (!clean || isTyping) return
    if (clean.length > 300) return

    const userMsg: DemoChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: clean,
      timestamp: formatNow(),
    }

    const nextHistory = [...messages, userMsg]
    setMessages(nextHistory)
    setInput('')
    setIsTyping(true)
    setTypingStatus(null)

    const callBackend = async (attempt = 0): Promise<string> => {
      let statusCode: number | null = null
      try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 8000)

        const res = await fetch(`${apiBase}/public/ai-demo`, {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: clean,
            sessionId,
            history: nextHistory.slice(-6).map((m) => ({ role: m.role, content: m.text })),
          }),
        })
        clearTimeout(timer)
        statusCode = res.status

        const json = (await res.json().catch(() => null)) as {
          success?: boolean
          message?: string
          data?: { reply?: string }
        } | null

        if (res.status === 429) {
          return json?.message || 'Demo rate limit reached. Sign up for a free workspace to keep chatting! 🚀'
        }

        if (res.ok && json?.success && json.data?.reply) {
          return json.data.reply
        }

        if (isWakeupOrNetworkError(statusCode, null) && attempt < 2) {
          setTypingStatus('Waking up Snowflex AI, one moment...')
          await new Promise((r) => setTimeout(r, 2800))
          return callBackend(attempt + 1)
        }

        return localFallbackReply(clean)
      } catch (err) {
        if (isWakeupOrNetworkError(statusCode, err) && attempt < 2) {
          setTypingStatus('Waking up Snowflex AI, one moment...')
          await new Promise((r) => setTimeout(r, 2800))
          return callBackend(attempt + 1)
        }
        return localFallbackReply(clean)
      }
    }

    const replyText = await callBackend(0)
    setIsTyping(false)
    setTypingStatus(null)
    setMessages((prev) => [
      ...prev,
      {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: replyText,
        timestamp: formatNow(),
      },
    ])
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendDemoMessage(input)
    }
  }

  if (!isOpen) return null

  const userMsgCount = messages.filter((m) => m.role === 'user').length
  const showQuickReplies = hasGreeted && userMsgCount === 0 && !isTyping

  return (
    <div
      className="fixed inset-0 z-[1400] flex items-end sm:items-end justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Snowflex AI Interactive Demo Chat"
    >
      {/* Soft Backdrop (click outside closes) */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Chat Panel: Full-screen mobile sheet -> 400x560 floating desktop panel */}
      <div
        ref={panelRef}
        className={`relative z-10 w-full h-[100dvh] sm:w-[400px] sm:h-[560px] sm:m-5 sm:rounded-2xl bg-white dark:bg-[#111b15] border border-[#dce5d9] dark:border-[#24382c] shadow-2xl flex flex-col overflow-hidden ${
          prefersReducedMotion ? '' : 'animate-[sfChatIn_0.22s_cubic-bezier(0.16,1,0.3,1)]'
        }`}
      >
        {/* Header */}
        <header className="flex items-center justify-between gap-2 px-4 py-3 bg-[#eef5eb] dark:bg-[#14261f] text-[#14241d] dark:text-white border-b border-[#dce5d9] dark:border-[#24382c] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Small Robot SVG Avatar */}
            <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#0e241e] border border-[#10b981]/50 grid place-items-center shrink-0">
              <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none" aria-hidden="true">
                <line x1="16" y1="6" x2="16" y2="3" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
                <circle cx="16" cy="2.5" r="2" fill="#ffd23f" />
                <rect x="6" y="7" width="20" height="16" rx="6" fill="#193c33" stroke="#10b981" strokeWidth="1.8" />
                <rect x="9" y="10" width="14" height="9" rx="3" fill="#09110d" />
                <circle cx="13" cy="14" r="1.6" fill="#7fe7ff" />
                <circle cx="19" cy="14" r="1.6" fill="#7fe7ff" />
                <path d="M13 17 Q16 19 19 17" stroke="#7fe7ff" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold leading-tight truncate text-[#14241d] dark:text-white">Snowflex AI</div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#059669] dark:text-[#a7f3d0]">
                <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                <span>Online • Demo</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleResetChat}
              className="px-2 py-1 rounded-lg bg-[#ddebd8] hover:bg-[#cfe3c8] dark:bg-white/10 dark:hover:bg-white/20 text-[11px] font-semibold text-[#193c33] dark:text-white/90 border-0 cursor-pointer inline-flex items-center gap-1"
              title="Reset chat"
            >
              <RotateCcw size={12} />
              <span>Reset chat</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-transparent hover:bg-[#ddebd8] dark:hover:bg-white/15 text-[#193c33] dark:text-white border-0 grid place-items-center cursor-pointer"
              aria-label="Close chat"
              title="Close (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-[#f7faf5] dark:bg-[#0d1510]">
          {messages.map((msg) => {
            const isUser = msg.role === 'user'
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} ${
                  prefersReducedMotion ? '' : 'animate-[sfMsgIn_0.2s_ease-out]'
                }`}
              >
                <div
                  className={`max-w-[84%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap break-words shadow-sm ${
                    isUser
                      ? 'bg-[#10b981] dark:bg-[#193c33] text-white rounded-br-sm'
                      : 'bg-white dark:bg-[#16221b] text-[#193c33] dark:text-[#e6efe8] border border-[#dce5d9] dark:border-[#24382c] rounded-bl-sm'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[10px] text-[#788a7f] dark:text-[#7f9487] mt-1 px-1">
                  {msg.timestamp}
                </span>
              </div>
            )
          })}

          {/* Quick-Reply Chips right after greeting */}
          {showQuickReplies && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {QUICK_REPLIES.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => void sendDemoMessage(chip)}
                  className="px-3 py-1.5 rounded-full bg-white dark:bg-[#16231b] hover:bg-[#e9f3e4] dark:hover:bg-[#1f3327] text-[#193c33] dark:text-[#d9ed74] border border-[#cfe0ca] dark:border-[#2a4234] text-xs font-semibold cursor-pointer transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Typing / Waking up indicator */}
          {isTyping && (
            <div className="flex flex-col items-start gap-1">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl rounded-bl-sm bg-white dark:bg-[#16221b] border border-[#dce5d9] dark:border-[#24382c]">
                <span className="w-2 h-2 rounded-full bg-[#10b981] animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 rounded-full bg-[#10b981] animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 rounded-full bg-[#10b981] animate-bounce" />
              </div>
              {typingStatus && (
                <span className="text-[11px] font-medium text-[#5a6f62] dark:text-[#96aa9d] px-1">
                  {typingStatus}
                </span>
              )}
            </div>
          )}

          {/* Soft Signup CTA after 5 user messages */}
          {userMsgCount >= 5 && !isTyping && (
            <div className="mt-1 p-3 rounded-xl bg-[#eef6ea] dark:bg-[#16271e] border border-[#cfe0ca] dark:border-[#2b4736] flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#193c33] dark:text-[#e6efe8] inline-flex items-center gap-1.5">
                <Sparkles size={14} className="text-[#10b981]" />
                Like it? Start your free trial 🚀
              </span>
              <Link
                to="/register"
                className="px-3 py-1.5 rounded-full bg-[#193c33] dark:bg-[#10b981] text-[#d9ed74] dark:text-[#08150e] text-[11px] font-extrabold no-underline shrink-0"
              >
                Sign Up
              </Link>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Box */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void sendDemoMessage(input)
          }}
          className="p-3 bg-white dark:bg-[#111b15] border-t border-[#e0e8dc] dark:border-[#223529] flex items-end gap-2 shrink-0"
        >
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isTyping}
            maxLength={300}
            placeholder="Ask Snowflex AI (demo)..."
            aria-label="Message Snowflex AI"
            className="flex-1 resize-none px-3.5 py-2.5 rounded-xl text-[13px] bg-[#f4f8f2] dark:bg-[#18241d] border border-[#dce5d9] dark:border-[#283e31] text-[#14241d] dark:text-white placeholder:text-[#788a7f] focus:outline-none focus:border-[#10b981] disabled:opacity-60 max-h-24"
          />
          <button
            type="submit"
            disabled={isTyping || !input.trim()}
            className="w-10 h-10 rounded-xl bg-[#193c33] hover:bg-[#235246] dark:bg-[#10b981] dark:hover:bg-[#34d399] text-[#d9ed74] dark:text-[#08150e] border-0 grid place-items-center cursor-pointer shrink-0 disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  )
}

