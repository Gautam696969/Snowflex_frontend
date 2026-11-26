import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import './SnowflexAISection.css'

const SnowflexChatDemo = lazy(() => import('./SnowflexChatDemo'))

interface SnowflexAISectionProps {
  isLoggedIn?: boolean
}

const SPEECH_MESSAGES = [
  "Hi! I'm Snowflex AI 👋",
  'Who is on leave today?',
  'Need attendance report? 📊',
  'Shift starts in 5 min ⏰',
  'Team chat & HD meetings? 📹',
  'Ask me anything!',
]

const AI_FEATURES = [
  {
    num: '01',
    title: 'Smart attendance insights',
    desc: 'Late arrivals, absences and trends, summarised automatically.',
  },
  {
    num: '02',
    title: 'Shift reminders',
    desc: 'Check-in and check-out alerts 5 minutes before shift time.',
  },
  {
    num: '03',
    title: 'Instant leave summaries',
    desc: 'Who is on leave, who is pending approval, all in one answer.',
  },
  {
    num: '04',
    title: 'Ask anything about your team',
    desc: 'Just type a question and Snowflex AI finds the answer.',
  },
]

export default function SnowflexAISection({ isLoggedIn: _isLoggedIn = false }: SnowflexAISectionProps) {
  const [msgIndex, setMsgIndex] = useState(0)
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 })
  const [isJumping, setIsJumping] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [hasOpenedChat, setHasOpenedChat] = useState(false)
  const robotWrapRef = useRef<HTMLDivElement>(null)
  const ctaBtnRef = useRef<HTMLButtonElement>(null)
  const jumpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const speechInterval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % SPEECH_MESSAGES.length)
    }, 5000)

    if (prefersReduced) {
      return () => {
        clearInterval(speechInterval)
        if (jumpTimerRef.current) clearTimeout(jumpTimerRef.current)
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      const el = robotWrapRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height * 0.38
      const dx = (e.clientX - cx) / 140
      const dy = (e.clientY - cy) / 140
      const clamp = (v: number, max: number) => Math.max(-max, Math.min(max, v))
      setEyeOffset({ x: clamp(dx, 4.5), y: clamp(dy, 3.2) })
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })

    return () => {
      clearInterval(speechInterval)
      window.removeEventListener('mousemove', handleMouseMove)
      if (jumpTimerRef.current) clearTimeout(jumpTimerRef.current)
    }
  }, [])

  const triggerJump = () => {
    setIsJumping(false)
    if (jumpTimerRef.current) clearTimeout(jumpTimerRef.current)
    requestAnimationFrame(() => {
      setIsJumping(true)
      jumpTimerRef.current = setTimeout(() => setIsJumping(false), 600)
    })
  }

  return (
    <section
      id="snowflex-ai"
      className="sf-ai-section min-h-screen flex items-center bg-[#f7f8f4] dark:bg-[#0c130f] max-w-[1160px] mx-auto px-4 sm:px-6 py-16 sm:py-20 border-t border-[#e4ece0] dark:border-[#1c2c22]"
    >
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
        {/* LEFT SIDE (~45%): Big Animated Robot + Soft Glowing Circle */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
          {/* Soft glowing circle behind robot */}
          <div
            aria-hidden="true"
            className="absolute w-[280px] h-[280px] sm:w-[360px] sm:h-[360px] rounded-full bg-gradient-to-tr from-[#10b981]/20 via-[#7fe7ff]/20 to-[#d9ed74]/25 dark:from-[#10b981]/25 dark:via-[#7fe7ff]/15 dark:to-[#d9ed74]/15 blur-2xl pointer-events-none"
          />

          <div
            ref={robotWrapRef}
            onMouseEnter={triggerJump}
            onClick={triggerJump}
            className="relative flex flex-col items-center cursor-pointer select-none"
          >
            {/* Cycling Speech Bubble */}
            <div
              key={msgIndex}
              role="status"
              aria-live="polite"
              className="mb-3 px-4 py-2 rounded-2xl bg-white dark:bg-[#162a22] text-[#193c33] dark:text-[#d9ed74] text-xs sm:text-sm font-bold shadow-lg border border-[#cfe0ca] dark:border-[#2a5c4d] relative transition-all duration-300"
            >
              <span>{SPEECH_MESSAGES[msgIndex]}</span>
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-white dark:bg-[#162a22] border-r border-b border-[#cfe0ca] dark:border-[#2a5c4d]" />
            </div>

            {/* Robot Wrapper (320px mobile, 440px desktop) */}
            <div className={`sf-ai-robot-hover ${isJumping ? 'is-jumping' : ''}`}>
              <svg
                viewBox="0 0 360 390"
                className="w-[300px] sm:w-[320px] lg:w-[440px] max-w-full h-auto overflow-visible"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                role="img"
                aria-label="Snowflex AI animated robot assistant"
              >
                <defs>
                  <linearGradient id="sfBotBody" x1="90" y1="60" x2="270" y2="330" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" style={{ stopColor: 'var(--bot-body-start)' }} />
                    <stop offset="100%" style={{ stopColor: 'var(--bot-body-end)' }} />
                  </linearGradient>
                  <linearGradient id="sfBotTrim" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#7fe7ff" />
                  </linearGradient>
                  <radialGradient id="sfBotFloorShadow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#081410" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#081410" stopOpacity="0" />
                  </radialGradient>
                </defs>

                {/* Floor Shadow (shrinks/grows with float) */}
                <ellipse
                  cx="180"
                  cy="366"
                  rx="92"
                  ry="16"
                  fill="url(#sfBotFloorShadow)"
                  className="sf-ai-shadow"
                />

                {/* Floating Robot Group */}
                <g className="sf-ai-float">
                  {/* Antenna */}
                  <line x1="180" y1="68" x2="180" y2="36" stroke="url(#sfBotTrim)" strokeWidth="6" strokeLinecap="round" />
                  <circle cx="180" cy="28" r="11" fill="#ffd23f" style={{ stroke: 'var(--bot-stroke)' }} strokeWidth="2.5" className="sf-ai-antenna-led" />

                  {/* Side Ears */}
                  <rect x="74" y="106" width="18" height="44" rx="9" fill="#10b981" style={{ stroke: 'var(--bot-stroke)' }} strokeWidth="3" />
                  <rect x="268" y="106" width="18" height="44" rx="9" fill="#10b981" style={{ stroke: 'var(--bot-stroke)' }} strokeWidth="3" />

                  {/* Left Arm */}
                  <g>
                    <path
                      d="M98 202 C66 212, 54 244, 66 270"
                      style={{ stroke: 'var(--bot-limb)' }}
                      strokeWidth="16"
                      strokeLinecap="round"
                    />
                    <path
                      d="M98 202 C66 212, 54 244, 66 270"
                      stroke="#10b981"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                    <circle cx="67" cy="276" r="11" fill="#d9ed74" style={{ stroke: 'var(--bot-stroke)' }} strokeWidth="3" />
                  </g>

                  {/* Right Arm (waves periodically) */}
                  <g className="sf-ai-right-arm">
                    <path
                      d="M262 202 C294 186, 310 152, 298 124"
                      style={{ stroke: 'var(--bot-limb)' }}
                      strokeWidth="16"
                      strokeLinecap="round"
                    />
                    <path
                      d="M262 202 C294 186, 310 152, 298 124"
                      stroke="#10b981"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                    <circle cx="297" cy="117" r="11" fill="#d9ed74" style={{ stroke: 'var(--bot-stroke)' }} strokeWidth="3" />
                  </g>

                  {/* Legs */}
                  <rect x="132" y="294" width="24" height="42" rx="10" style={{ fill: 'var(--bot-leg)' }} stroke="#10b981" strokeWidth="3" />
                  <rect x="204" y="294" width="24" height="42" rx="10" style={{ fill: 'var(--bot-leg)' }} stroke="#10b981" strokeWidth="3" />
                  <rect x="124" y="330" width="38" height="16" rx="8" fill="#10b981" style={{ stroke: 'var(--bot-stroke)' }} strokeWidth="2.5" />
                  <rect x="198" y="330" width="38" height="16" rx="8" fill="#10b981" style={{ stroke: 'var(--bot-stroke)' }} strokeWidth="2.5" />

                  {/* Neck */}
                  <rect x="162" y="168" width="36" height="18" rx="6" fill="#10b981" />

                  {/* Rounded Head */}
                  <rect
                    x="92"
                    y="68"
                    width="176"
                    height="106"
                    rx="36"
                    fill="url(#sfBotBody)"
                    stroke="url(#sfBotTrim)"
                    strokeWidth="4"
                  />

                  {/* Dark Face Screen */}
                  <rect x="112" y="88" width="136" height="68" rx="22" fill="#09110d" stroke="#264b3e" strokeWidth="2" />

                  {/* Cyan Eyes (follow pointer slightly + blink) */}
                  <g style={{ transform: `translate(${eyeOffset.x}px, ${eyeOffset.y}px)`, transition: 'transform 120ms ease-out' }}>
                    <rect x="136" y="106" width="20" height="24" rx="10" fill="#7fe7ff" className="sf-ai-eye" />
                    <rect x="204" y="106" width="20" height="24" rx="10" fill="#7fe7ff" className="sf-ai-eye" />
                    <circle cx="143" cy="113" r="3.5" fill="#ffffff" opacity="0.85" />
                    <circle cx="211" cy="113" r="3.5" fill="#ffffff" opacity="0.85" />
                  </g>

                  {/* Smile */}
                  <path
                    d="M162 138 Q180 150 198 138"
                    stroke="#7fe7ff"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    fill="none"
                  />

                  {/* Body Torso */}
                  <rect
                    x="104"
                    y="182"
                    width="152"
                    height="118"
                    rx="30"
                    fill="url(#sfBotBody)"
                    stroke="url(#sfBotTrim)"
                    strokeWidth="4"
                  />

                  {/* Chest Panel + Two Blinking LEDs */}
                  <rect x="130" y="206" width="100" height="66" rx="16" fill="#0b1510" stroke="#285042" strokeWidth="2" />
                  <circle cx="158" cy="232" r="7" fill="#7fe7ff" className="sf-ai-chest-led-a" />
                  <circle cx="202" cy="232" r="7" fill="#ffd23f" className="sf-ai-chest-led-b" />
                  <rect x="148" y="250" width="64" height="6" rx="3" fill="#10b981" opacity="0.7" />
                </g>
              </svg>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE (~55%): Editorial Layout Without Cards or Boxes */}
        <div className="lg:col-span-7 flex flex-col items-start">
          <span className="text-[11px] font-mono font-bold uppercase tracking-[0.16em] text-[#10b981] mb-2">
            AI ASSISTANT
          </span>

          <h2 className="text-3xl sm:text-4xl lg:text-[2.65rem] font-extrabold tracking-tight leading-[1.12] text-[#14241d] dark:text-white m-0 mb-3">
            Meet{' '}
            <span className="bg-gradient-to-r from-[#10b981] via-[#193c33] to-[#059669] dark:from-[#d9ed74] dark:via-[#7fe7ff] dark:to-[#10b981] bg-clip-text text-transparent">
              Snowflex AI
            </span>
          </h2>

          <p className="text-sm sm:text-base text-[#4c6154] dark:text-[#9eb2a5] leading-relaxed m-0 mb-8 max-w-[560px]">
            Your smart assistant for attendance, shifts, leave and reports. Ask anything about your team and get answers instantly.
          </p>

          {/* Numbered List (01 to 04) separated by thin horizontal dividers — no cards/boxes */}
          <div className="w-full divide-y divide-[#dce5d9] dark:divide-[#203328] border-t border-b border-[#dce5d9] dark:border-[#203328] mb-8">
            {AI_FEATURES.map((item) => (
              <div
                key={item.num}
                className="py-4 flex items-baseline gap-4 sm:gap-5 transition-transform duration-200 hover:translate-x-2"
              >
                <span className="font-mono text-xs sm:text-sm font-extrabold text-[#10b981] shrink-0">
                  {item.num}
                </span>
                <p className="m-0 text-sm sm:text-[15px] leading-snug text-[#4c6154] dark:text-[#9cb0a3]">
                  <strong className="font-bold text-[#14241d] dark:text-white mr-1.5">
                    {item.title}:
                  </strong>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          <button
            ref={ctaBtnRef}
            type="button"
            onClick={() => {
              triggerJump()
              setHasOpenedChat(true)
              setChatOpen(true)
            }}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#10b981] hover:bg-[#059669] dark:bg-[#193c33] dark:hover:bg-[#235246] text-white dark:text-[#d9ed74] text-sm font-extrabold border-0 cursor-pointer shadow-lg shadow-[#10b981]/20 dark:shadow-[#193c33]/15 transition-all duration-200 hover:-translate-y-0.5"
          >
            <span>Try Snowflex AI →</span>
          </button>
        </div>
      </div>

      {hasOpenedChat && (
        <Suspense fallback={null}>
          <SnowflexChatDemo
            isOpen={chatOpen}
            onClose={() => setChatOpen(false)}
            returnFocusTo={ctaBtnRef}
          />
        </Suspense>
      )}
    </section>
  )
}

