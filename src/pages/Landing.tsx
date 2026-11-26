import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BellRing,
  Bot,
  CalendarCheck,
  Camera,
  CheckCircle2,
  Menu,
  MessageSquare,
  Moon,
  ShieldCheck,
  Smartphone,
  Snowflake,
  Sparkles,
  Sun,
  Video,
  X,
} from 'lucide-react'
import { toggleThemeMode } from '../lib/theme'
import { readToken } from '../lib/auth-api'
import SnowflexAISection from '../components/SnowflexAISection'
import './Landing.css'

type ShowcaseTab = 'attendance' | 'meet' | 'ai'

const features = [
  {
    icon: Camera,
    title: 'Selfie Attendance',
    desc: 'Un-mirrored portrait check-in & check-out with 3X admin photo inspection.',
  },
  {
    icon: Video,
    title: 'Chat, Calls & Meetings',
    desc: 'Real-time team messaging, 1-to-1 video calls, and multi-user screen sharing.',
  },
  {
    icon: Bot,
    title: 'AI Employee Copilot',
    desc: 'Instant answers on HR policies, shift metrics, and natural-language leave requests.',
  },
  {
    icon: BellRing,
    title: 'Shift Push Reminders',
    desc: 'Automatic mobile alerts 5 minutes before shift start and end — even when closed.',
  },
  {
    icon: CalendarCheck,
    title: 'Leaves & Holidays',
    desc: 'Live leave balances, multi-tier approvals, and synced company holiday calendars.',
  },
  {
    icon: Smartphone,
    title: 'Installable PWA',
    desc: 'Stay logged in across restarts with offline resilience and adaptive dark/light mode.',
  },
]

const steps = [
  {
    num: '01',
    title: 'Sign In Once',
    desc: 'Secure JWT + refresh sessions keep employees logged in without daily re-authentication.',
  },
  {
    num: '02',
    title: 'Check In & Collaborate',
    desc: 'Verify shifts with a 1-tap camera selfie, chat live, or launch a screen-sharing meeting.',
  },
  {
    num: '03',
    title: 'Track Everything Live',
    desc: 'Admins review punches, approve leaves, and monitor attendance in real time.',
  },
]

export default function Landing() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<ShowcaseTab>('attendance')
  const isLoggedIn = Boolean(readToken())

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 16)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Auto-cycle hero preview tabs gently
  useEffect(() => {
    const order: ShowcaseTab[] = ['attendance', 'meet', 'ai']
    const timer = setInterval(() => {
      setActiveTab((prev) => order[(order.indexOf(prev) + 1) % order.length])
    }, 4500)
    return () => clearInterval(timer)
  }, [])

  // Animated robot favicon on Chrome tab while on Landing page
  useEffect(() => {
    const favicon = document.getElementById('app-favicon') as HTMLLinkElement | null
    if (!favicon) return
    const originalHref = favicon.getAttribute('href') || '/favicon-blue.svg'

    const makeRobotIcon = (frame: 0 | 1 | 2 | 3) => {
      const yShift = frame === 1 ? -0.8 : frame === 3 ? 0.6 : 0
      const ledColor = frame === 1 || frame === 3 ? '#fff07c' : '#ffd23f'
      const ledRadius = frame === 1 ? '2.4' : '1.9'
      const eyeH = frame === 2 ? '1.3' : '3'
      const eyeY = frame === 2 ? '10' : '9'
      const rightArmPath =
        frame === 1 || frame === 3 ? 'M23.5 18 Q27.5 15 28.5 11.5' : 'M23.5 18 Q27 17 27.5 13.5'
      const handX = frame === 1 || frame === 3 ? '28.5' : '27.5'
      const handY = frame === 1 || frame === 3 ? '11.2' : '13.2'
      const chestColor = frame % 2 === 0 ? '#7fe7ff' : '#ffd23f'

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><g transform="translate(0,${yShift})"><line x1="16" y1="5.5" x2="16" y2="2.5" stroke="#10b981" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="2.2" r="${ledRadius}" fill="${ledColor}"/><path d="M8.5 18 Q5 20 5.5 23.5" stroke="#10b981" stroke-width="2.6" stroke-linecap="round" fill="none"/><circle cx="5.5" cy="24" r="1.6" fill="#d9ed74"/><path d="${rightArmPath}" stroke="#10b981" stroke-width="2.6" stroke-linecap="round" fill="none"/><circle cx="${handX}" cy="${handY}" r="1.6" fill="#d9ed74"/><rect x="11" y="25" width="3.4" height="4.5" rx="1.4" fill="#193c33" stroke="#10b981" stroke-width="1.2"/><rect x="17.6" y="25" width="3.4" height="4.5" rx="1.4" fill="#193c33" stroke="#10b981" stroke-width="1.2"/><rect x="10" y="28.5" width="5" height="2.2" rx="1.1" fill="#10b981"/><rect x="17" y="28.5" width="5" height="2.2" rx="1.1" fill="#10b981"/><rect x="8" y="5.5" width="16" height="10.5" rx="4" fill="#193c33" stroke="#10b981" stroke-width="1.6"/><rect x="10" y="7.4" width="12" height="6.8" rx="2.4" fill="#09110d"/><rect x="12" y="${eyeY}" width="2.6" height="${eyeH}" rx="1.2" fill="#7fe7ff"/><rect x="17.4" y="${eyeY}" width="2.6" height="${eyeH}" rx="1.2" fill="#7fe7ff"/><rect x="9" y="16.5" width="14" height="9" rx="3.2" fill="#193c33" stroke="#10b981" stroke-width="1.6"/><rect x="12" y="18.6" width="8" height="4.6" rx="1.5" fill="#09110d"/><circle cx="14.2" cy="20.9" r="1.1" fill="${chestColor}"/><rect x="16.5" y="20.2" width="2.5" height="1.4" rx="0.7" fill="#10b981"/></g></svg>`
      return `data:image/svg+xml,${encodeURIComponent(svg)}`
    }

    const frames = [makeRobotIcon(0), makeRobotIcon(1), makeRobotIcon(2), makeRobotIcon(3)]
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let idx = 0
    favicon.setAttribute('href', frames[0])

    if (prefersReduced) {
      return () => {
        favicon.setAttribute('href', originalHref)
      }
    }

    const interval = setInterval(() => {
      idx = (idx + 1) % frames.length
      favicon.setAttribute('href', frames[idx])
    }, 650)

    return () => {
      clearInterval(interval)
      favicon.setAttribute('href', originalHref)
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#f6f9f4] dark:bg-[#0b120e] text-[#14241d] dark:text-[#edf5ef] transition-colors duration-200 overflow-x-hidden selection:bg-[#10b981]/30">
      {/* Ambient Animated Background Blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        <div className="snow-animate-blob absolute -top-28 -left-24 w-[380px] h-[380px] rounded-full bg-[#10b981]/12 dark:bg-[#10b981]/15 blur-[90px]" />
        <div className="snow-animate-blob absolute top-[35%] -right-28 w-[420px] h-[420px] rounded-full bg-[#d9ed74]/25 dark:bg-[#059669]/15 blur-[110px] [animation-delay:2.5s]" />
      </div>

      {/* 1. Sticky Navbar */}
      <header
        className={`sticky top-0 z-50 w-full backdrop-blur-md transition-all duration-200 border-b ${
          isScrolled
            ? 'bg-[#f6f9f4]/90 dark:bg-[#0b120e]/90 border-[#dce5d9] dark:border-[#1f3126] shadow-sm'
            : 'bg-transparent border-transparent'
        }`}
      >
        <div className="max-w-[1160px] mx-auto px-4 sm:px-6 h-[68px] flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 no-underline text-inherit group">
            <span className="w-9 h-9 rounded-xl bg-[#10b981] dark:bg-[#193c33] text-white dark:text-[#d9ed74] grid place-items-center shadow-md transition-transform duration-200 group-hover:scale-105">
              <Snowflake size={20} strokeWidth={2.3} />
            </span>
            <div className="flex flex-col leading-none">
              <span className="text-[18px] font-extrabold tracking-tight text-[#193c33] dark:text-white">
                snowflex
              </span>
              <span className="text-[9.5px] font-bold tracking-[0.12em] uppercase text-[#10b981] mt-0.5">
                People Ops
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#4a5e52] dark:text-[#9cb0a3]">
            <a href="#features" className="no-underline text-inherit hover:text-[#10b981] transition-colors">
              Features
            </a>
            <a href="#workflow" className="no-underline text-inherit hover:text-[#10b981] transition-colors">
              How It Works
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => toggleThemeMode()}
              className="w-9 h-9 rounded-xl border border-[#dce5d9] dark:border-[#24382c] bg-white/80 dark:bg-[#142019] text-[#355143] dark:text-[#c7d6cc] grid place-items-center cursor-pointer hover:border-[#10b981] transition-colors"
              aria-label="Toggle theme"
              title="Toggle dark / light mode"
            >
              <Sun size={17} className="hidden dark:block" />
              <Moon size={17} className="block dark:hidden" />
            </button>

            {isLoggedIn ? (
              <Link
                to="/dashboard"
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#10b981] hover:bg-[#059669] dark:bg-[#193c33] dark:hover:bg-[#235246] text-white dark:text-[#d9ed74] text-xs sm:text-sm font-bold no-underline shadow-sm transition-all hover:-translate-y-0.5"
              >
                <span>Open Dashboard</span>
                <ArrowRight size={15} />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden sm:inline-flex items-center px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[#193c33] dark:text-[#e3ebe5] hover:bg-[#e8f0e4] dark:hover:bg-[#18261e] no-underline transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#10b981] hover:bg-[#059669] dark:bg-[#193c33] dark:hover:bg-[#235246] text-white dark:text-[#d9ed74] text-xs sm:text-sm font-bold no-underline shadow-sm transition-all hover:-translate-y-0.5"
                >
                  <span>Get Started</span>
                  <ArrowRight size={15} />
                </Link>
              </>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="md:hidden w-9 h-9 rounded-xl border border-[#dce5d9] dark:border-[#24382c] bg-white/80 dark:bg-[#142019] text-[#193c33] dark:text-white grid place-items-center cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-[#111b15] border-b border-[#dce5d9] dark:border-[#24382c] px-4 py-4 flex flex-col gap-2.5">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 text-sm font-semibold text-[#2d4437] dark:text-[#d1dfd6] no-underline"
            >
              Features
            </a>
            <a
              href="#workflow"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 text-sm font-semibold text-[#2d4437] dark:text-[#d1dfd6] no-underline"
            >
              How It Works
            </a>
            <div className="flex gap-2 pt-2 border-t border-[#e7ede4] dark:border-[#223329]">
              {isLoggedIn ? (
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center py-2.5 rounded-xl bg-[#10b981] dark:bg-[#193c33] text-white dark:text-[#d9ed74] text-sm font-bold no-underline"
                >
                  Open Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 text-center py-2.5 rounded-xl border border-[#dce5d9] dark:border-[#293e31] text-sm font-semibold text-[#193c33] dark:text-white no-underline"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 text-center py-2.5 rounded-xl bg-[#10b981] dark:bg-[#193c33] text-white dark:text-[#d9ed74] text-sm font-bold no-underline"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* 2. Hero Section */}
      <main className="relative z-10">
        <section className="max-w-[1160px] mx-auto px-4 sm:px-6 pt-10 pb-16 sm:pt-16 sm:pb-24 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          {/* Left Copy */}
          <div className="lg:col-span-6 flex flex-col items-start">
            <div className="snow-animate-fade-up inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-[#15221b] border border-[#dce5d9] dark:border-[#263b2e] text-xs font-bold text-[#193c33] dark:text-[#86efac] shadow-sm mb-5">
              <Sparkles size={13} className="text-[#10b981]" />
              <span>Attendance • Team Chat • HD Meet • AI Copilot</span>
            </div>

            <h1 className="snow-animate-fade-up snow-animate-delay-1 text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.1] text-[#14241d] dark:text-white m-0 mb-4">
              Workforce Ops,{' '}
              <span className="bg-gradient-to-r from-[#10b981] to-[#193c33] dark:from-[#d9ed74] dark:to-[#34d399] bg-clip-text text-transparent">
                Simple &amp; Verified.
              </span>
            </h1>

            <p className="snow-animate-fade-up snow-animate-delay-2 text-base sm:text-lg text-[#4c6154] dark:text-[#9eb2a5] leading-relaxed m-0 mb-7 max-w-[520px]">
              Eliminate proxy check-ins with camera selfies, collaborate via live chat and screen-sharing meetings, and manage leaves in one fast PWA.
            </p>

            <div className="snow-animate-fade-up snow-animate-delay-3 flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <Link
                to={isLoggedIn ? '/dashboard' : '/register'}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#10b981] hover:bg-[#059669] dark:bg-[#193c33] dark:hover:bg-[#235246] text-white dark:text-[#d9ed74] text-sm font-bold no-underline shadow-lg shadow-[#10b981]/20 dark:shadow-[#193c33]/15 transition-all hover:-translate-y-0.5 w-full sm:w-auto"
              >
                <span>{isLoggedIn ? 'Go to Workspace' : 'Start Free Workspace'}</span>
                <ArrowRight size={16} />
              </Link>
              {!isLoggedIn && (
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white dark:bg-[#142019] border border-[#d6e2d2] dark:border-[#283d30] hover:border-[#10b981] text-[#193c33] dark:text-white text-sm font-bold no-underline transition-all w-full sm:w-auto"
                >
                  <span>Sign In</span>
                </Link>
              )}
            </div>

            <div className="snow-animate-fade-up snow-animate-delay-3 flex flex-wrap items-center gap-4 mt-7 text-xs font-medium text-[#5a6f62] dark:text-[#8ea195]">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-[#10b981]" /> Stay Logged In (60d)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-[#10b981]" /> 5-Min Shift Push Alerts
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-[#10b981]" /> Dark &amp; Light Mode
              </span>
            </div>
          </div>

          {/* Right Animated Interactive Showcase */}
          <div className="lg:col-span-6 snow-animate-fade-up snow-animate-delay-2">
            <div className="snow-animate-float rounded-2xl bg-white dark:bg-[#131e18] border border-[#dce5d9] dark:border-[#273c2f] shadow-[0_24px_60px_-15px_rgba(25,60,51,0.18)] dark:shadow-[0_24px_60px_-15px_rgba(0,0,0,0.6)] overflow-hidden">
              {/* Interactive Tab Bar */}
              <div className="flex items-center justify-between gap-2 px-4 py-3 bg-[#f8fbf7] dark:bg-[#0f1813] border-b border-[#e5ede2] dark:border-[#22352a]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]/80" />
                </div>

                <div className="flex items-center gap-1 bg-[#edf3ea] dark:bg-[#18261e] p-1 rounded-lg">
                  {(
                    [
                      { id: 'attendance', label: 'Selfie Punch' },
                      { id: 'meet', label: 'Chat & Meet' },
                      { id: 'ai', label: 'AI Bot' },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveTab(t.id)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold border-0 cursor-pointer transition-all ${
                        activeTab === t.id
                          ? 'bg-[#10b981] dark:bg-[#193c33] text-white dark:text-[#d9ed74] shadow-sm'
                          : 'bg-transparent text-[#586e60] dark:text-[#96a99d] hover:text-[#193c33] dark:hover:text-white'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Animated Preview Body */}
              <div className="p-5 sm:p-6 min-h-[280px] flex flex-col justify-center">
                {activeTab === 'attendance' && (
                  <div className="flex flex-col sm:flex-row items-center gap-5">
                    <div className="relative w-36 h-44 rounded-2xl bg-[#eef7f1] dark:bg-[#0d1611] border-2 border-[#10b981]/45 dark:border-[#10b981]/50 overflow-hidden flex items-center justify-center shrink-0">
                      <div className="w-20 h-24 rounded-[50%] border-2 border-dashed border-[#10b981]/80 dark:border-[#34d399]/80 bg-white/60 dark:bg-transparent flex items-center justify-center text-[#193c33] dark:text-[#34d399]">
                        <svg viewBox="0 0 24 24" className="w-9 h-9" fill="currentColor" aria-hidden="true">
                          <path d="M12 12a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5Zm0 2.25c-4.08 0-7.5 2.02-7.5 4.5V20a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-1.25c0-2.48-3.42-4.5-7.5-4.5Z" />
                        </svg>
                      </div>
                      <div className="snow-animate-scan absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#10b981] dark:via-[#34d399] to-transparent" />
                      <span className="absolute bottom-2 px-2 py-0.5 rounded-full bg-white/95 dark:bg-black/75 text-[#059669] dark:text-[#34d399] border border-[#10b981]/30 dark:border-transparent font-mono text-[9.5px] font-bold shadow-sm">
                        VERIFIED • 09:00 AM
                      </span>
                    </div>
                    <div className="flex flex-col gap-2 text-center sm:text-left">
                      <span className="inline-flex items-center justify-center sm:justify-start gap-1.5 text-[11px] font-mono font-bold uppercase text-[#10b981]">
                        <ShieldCheck size={14} /> Zero Proxy Check-In
                      </span>
                      <h3 className="m-0 text-lg font-extrabold text-[#193c33] dark:text-white">
                        Natural Camera Verification
                      </h3>
                      <p className="m-0 text-xs text-[#54695c] dark:text-[#9ab0a2] leading-relaxed">
                        Un-mirrored portrait capture uploads cleanly to Cloudflare D1 with 3X optical zoom inspection for admins.
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === 'meet' && (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#10b981]">
                        <MessageSquare size={14} /> Live Team Chat &amp; Screen Share
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#ecfdf5] dark:bg-[#122b1f] text-[#059669] dark:text-[#34d399] text-[10px] font-bold">
                        LIVE SYNC
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#f4f8f2] dark:bg-[#18251e] border border-[#dce6d8] dark:border-[#293e31] flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-[#10b981] dark:bg-[#193c33] text-white dark:text-[#d9ed74] grid place-items-center shrink-0">
                          <Video size={17} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">Daily Sprint Standup</div>
                          <div className="text-[11px] text-[#64776c] dark:text-[#96a99d]">
                            Host: Ami • HD Video + Screen Share
                          </div>
                        </div>
                      </div>
                      <span className="px-3 py-1.5 rounded-lg bg-[#10b981] dark:bg-[#193c33] text-white dark:text-[#d9ed74] text-[11px] font-bold shrink-0">
                        Join Now
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-semibold">
                      <div className="p-2 rounded-lg bg-[#f8fbf7] dark:bg-[#101914] border border-[#e3ece0] dark:border-[#223329]">
                        1-to-1 Calls
                      </div>
                      <div className="p-2 rounded-lg bg-[#f8fbf7] dark:bg-[#101914] border border-[#e3ece0] dark:border-[#223329]">
                        Screen Share
                      </div>
                      <div className="p-2 rounded-lg bg-[#f8fbf7] dark:bg-[#101914] border border-[#e3ece0] dark:border-[#223329]">
                        Host Controls
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'ai' && (
                  <div className="flex flex-col gap-3">
                    <div className="self-end max-w-[85%] px-3.5 py-2 rounded-2xl rounded-br-sm bg-[#10b981] dark:bg-[#193c33] text-white text-xs font-medium">
                      &ldquo;How many casual leaves do I have left this quarter?&rdquo;
                    </div>
                    <div className="self-start max-w-[92%] p-3.5 rounded-2xl rounded-bl-sm bg-[#f2f7ef] dark:bg-[#18261e] border border-[#dce6d8] dark:border-[#293e31] text-xs flex flex-col gap-1.5">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase text-[#10b981]">
                        <Bot size={13} /> Snowflex AI Employee
                      </span>
                      <p className="m-0 text-[#2b4235] dark:text-[#d8e6dc] leading-relaxed">
                        You have <strong>8 Casual Leaves</strong> and <strong>10 Medical Leaves</strong> remaining. Would you like me to draft a leave request for tomorrow?
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 3. Simple 6-Card Features Grid */}
        <section id="features" className="max-w-[1160px] mx-auto px-4 sm:px-6 py-14 sm:py-20 border-t border-[#e4ece0] dark:border-[#1c2c22]">
          <div className="text-center max-w-[580px] mx-auto mb-10">
            <span className="text-[11px] font-mono font-bold uppercase tracking-[0.12em] text-[#10b981]">
              ALL-IN-ONE WORKSPACE
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#14241d] dark:text-white mt-1.5 mb-2">
              Everything your team needs, zero clutter
            </h2>
            <p className="text-sm text-[#54695c] dark:text-[#9cb0a3] m-0">
              Built for speed on both mobile PWAs and desktop workstations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {features.map((f) => {
              const Icon = f.icon
              return (
                <div
                  key={f.title}
                  className="group p-5 rounded-2xl bg-white dark:bg-[#121c16] border border-[#e0e8dc] dark:border-[#223529] hover:border-[#10b981]/60 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#eef6ea] dark:bg-[#1a2b21] text-[#193c33] dark:text-[#d9ed74] grid place-items-center mb-3.5 transition-transform duration-200 group-hover:scale-110">
                    <Icon size={20} />
                  </div>
                  <h3 className="text-base font-bold text-[#14241d] dark:text-white m-0 mb-1.5">
                    {f.title}
                  </h3>
                  <p className="text-xs sm:text-[13px] text-[#566b5e] dark:text-[#96aa9d] m-0 leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              )
            })}
          </div>
        </section>

        <SnowflexAISection isLoggedIn={isLoggedIn} />

        {/* 4. Simple 3-Step Workflow */}
        <section id="workflow" className="max-w-[1160px] mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="rounded-3xl bg-white dark:bg-[#12221a] border border-[#dce5d9] dark:border-[#254d40] p-7 sm:p-10 text-[#14241d] dark:text-white shadow-sm dark:shadow-none">
            <div className="text-center mb-8">
              <span className="text-[11px] font-mono font-bold uppercase tracking-[0.12em] text-[#10b981] dark:text-[#d9ed74]">
                HOW IT WORKS
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#14241d] dark:text-white mt-1 mb-0">
                Up and running in 3 simple steps
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {steps.map((s) => (
                <div
                  key={s.num}
                  className="p-5 rounded-2xl bg-[#f7faf5] dark:bg-white/5 border border-[#dce5d9] dark:border-white/10 hover:bg-[#eef5ea] dark:hover:bg-white/10 transition-colors"
                >
                  <span className="inline-block font-mono text-xs font-black text-[#10b981] dark:text-[#d9ed74] mb-2">
                    STEP {s.num}
                  </span>
                  <h3 className="text-base font-bold text-[#14241d] dark:text-white m-0 mb-1.5">{s.title}</h3>
                  <p className="text-xs text-[#54695c] dark:text-white/75 m-0 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5. Clean Bottom CTA */}
        <section className="max-w-[1160px] mx-auto px-4 sm:px-6 py-12 pb-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#14241d] dark:text-white m-0 mb-2">
            Ready to launch with Snowflex?
          </h2>
          <p className="text-sm text-[#54695c] dark:text-[#9cb0a3] m-0 mb-6">
            Create your employee account or sign in to your workspace.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to={isLoggedIn ? '/dashboard' : '/register'}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#10b981] hover:bg-[#059669] dark:bg-[#193c33] dark:hover:bg-[#235246] text-white dark:text-[#d9ed74] text-sm font-bold no-underline shadow-md transition-all hover:-translate-y-0.5"
            >
              <span>{isLoggedIn ? 'Open Dashboard' : 'Create Account'}</span>
              <ArrowRight size={16} />
            </Link>
            {!isLoggedIn && (
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white dark:bg-[#142019] border border-[#d6e2d2] dark:border-[#283d30] text-[#193c33] dark:text-white text-sm font-bold no-underline hover:border-[#10b981] transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </section>
      </main>

      {/* 6. Minimal Footer */}
      <footer className="border-t border-[#e4ece0] dark:border-[#1c2c22] py-6 px-4 sm:px-6 text-xs text-[#64786b] dark:text-[#86998c]">
        <div className="max-w-[1160px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-semibold text-[#193c33] dark:text-[#d9ed74]">
            <Snowflake size={14} />
            <span>Snowflex People Operations</span>
          </div>
          <span>© {new Date().getFullYear()} Snowflex. All rights reserved.</span>
        </div>
      </footer>
    </div>
  )
}
