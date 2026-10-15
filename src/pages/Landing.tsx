import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import {
  Snowflake, Sparkles, ArrowRight, CheckCircle2, ShieldCheck,
  Users, Clock, Calendar, DollarSign, Award, BarChart3,
  ChevronDown, MessageSquare, Bot, Play, Server, Layers,
  Lock, Check, Menu, X, Sun, Moon, MapPin, Zap
} from 'lucide-react'
import { useTheme } from '../lib/theme'
import './Landing.css'

export default function Landing() {
  const { theme, toggleTheme } = useTheme()
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual')
  const [activeMockupTab, setActiveMockupTab] = useState<'overview' | 'attendance' | 'leaves' | 'copilot' | 'payroll'>('overview')
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false)

  // Interactive mockup states
  const [approvedLeaveId, setApprovedLeaveId] = useState<number | null>(null)
  const [copilotQuestion, setCopilotQuestion] = useState('How does our engineering turnover compare to tech benchmarks?')
  const [copilotAnswer, setCopilotAnswer] = useState(
    'Engineering annualized turnover is currently 4.2%, which is 62% lower than the tech industry median of 11.0%. The newly implemented senior IC promotion tracks in Q2 contributed directly to retaining 98% of core contributors.'
  )

  // Demo form state
  const [demoForm, setDemoForm] = useState({
    name: '',
    email: '',
    company: '',
    size: '50-250',
    message: ''
  })
  const [submittingDemo, setSubmittingDemo] = useState(false)

  // Navbar scroll detection
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleApproveLeave = (id: number) => {
    setApprovedLeaveId(id)
    toast.success('Leave request approved! Synced to Snowflake HR ledger.')
  }

  const handleSelectAiPrompt = (prompt: string, answer: string) => {
    setCopilotQuestion(prompt)
    setCopilotAnswer(answer)
  }

  const handleSubmitDemo = (e: React.FormEvent) => {
    e.preventDefault()
    if (!demoForm.name || !demoForm.email) {
      toast.error('Please provide your name and work email.')
      return
    }
    setSubmittingDemo(true)
    setTimeout(() => {
      setSubmittingDemo(false)
      setIsDemoModalOpen(false)
      toast.success('Thank you! A SnowFlex Enterprise specialist will reach out within 2 hours.')
      setDemoForm({ name: '', email: '', company: '', size: '50-250', message: '' })
    }, 900)
  }

  return (
    <div className="snow-landing font-['DM_Sans',-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif] bg-[var(--snow-bg)] text-[var(--snow-text-primary)] min-h-screen relative overflow-x-hidden transition-[background-color,color] duration-300 ease leading-[1.6]">
      {/* ====================================================================
          1. STICKY NAVBAR
          ==================================================================== */}
      <header className={`snow-navbar sticky top-0 z-[100] w-full backdrop-blur-[18px] bg-[var(--snow-nav-bg)] border-b border-[var(--snow-border-subtle)] transition-all duration-[250ms] ease ${isScrolled ? 'is-scrolled border-b-[var(--snow-border)] shadow-[0_8px_24px_-6px_rgba(0,0,0,0.05)]' : ''}`}>
        <div className="snow-container w-full max-w-[1240px] mx-auto px-6 relative z-[1] max-md:px-4">
          <div className="snow-nav-inner flex items-center justify-between h-[74px] max-md:h-16">
            {/* Brand Logo */}
            <Link to="/" className="snow-brand-link flex items-center gap-2.5 no-underline text-[var(--snow-text-primary)] font-bold text-[1.35rem] tracking-[-0.02em] transition-transform duration-200 ease hover:-translate-y-[1px]">
              <span className="snow-logo-mark inline-flex items-center justify-center w-[38px] h-[38px] max-md:w-8 max-md:h-8 rounded-[10px] bg-gradient-to-br from-[#0284c7] to-[#38bdf8] text-white shadow-[0_4px_14px_rgba(14,165,233,0.35)] relative overflow-hidden">
                <Snowflake size={22} strokeWidth={2.4} />
              </span>
              <div className="snow-brand-text flex flex-col">
                <span className="snow-brand-title text-[1.25rem] max-md:text-[1.1rem] font-extrabold leading-[1.1] bg-gradient-to-br from-[var(--snow-text-primary)] via-[var(--snow-text-primary)] to-[var(--snow-accent)] bg-clip-text text-transparent">snowflex</span>
                <span className="snow-brand-badge text-[0.62rem] max-md:text-[0.52rem] font-bold tracking-[0.08em] text-[var(--snow-accent)] uppercase">ENTERPRISE PEOPLE OPS</span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav aria-label="Main Navigation">
              <ul className="snow-nav-links flex items-center gap-7 list-none m-0 p-0 max-lg:hidden">
                <li><a href="#features" className="snow-nav-link no-underline text-[var(--snow-text-secondary)] text-[0.94rem] font-medium transition-colors duration-200 ease relative py-1.5 px-0.5 hover:text-[var(--snow-accent)]">Features</a></li>
                <li><a href="#mockup" className="snow-nav-link no-underline text-[var(--snow-text-secondary)] text-[0.94rem] font-medium transition-colors duration-200 ease relative py-1.5 px-0.5 hover:text-[var(--snow-accent)]">Product Tour</a></li>
                <li><a href="#how-it-works" className="snow-nav-link no-underline text-[var(--snow-text-secondary)] text-[0.94rem] font-medium transition-colors duration-200 ease relative py-1.5 px-0.5 hover:text-[var(--snow-accent)]">How It Works</a></li>
                <li><a href="#pricing" className="snow-nav-link no-underline text-[var(--snow-text-secondary)] text-[0.94rem] font-medium transition-colors duration-200 ease relative py-1.5 px-0.5 hover:text-[var(--snow-accent)]">Pricing</a></li>
                <li><a href="#testimonials" className="snow-nav-link no-underline text-[var(--snow-text-secondary)] text-[0.94rem] font-medium transition-colors duration-200 ease relative py-1.5 px-0.5 hover:text-[var(--snow-accent)]">Reviews</a></li>
                <li><a href="#faq" className="snow-nav-link no-underline text-[var(--snow-text-secondary)] text-[0.94rem] font-medium transition-colors duration-200 ease relative py-1.5 px-0.5 hover:text-[var(--snow-accent)]">FAQ</a></li>
              </ul>
            </nav>

            {/* Navbar Actions */}
            <div className="snow-nav-actions flex items-center gap-3">
              <button
                type="button"
                className="snow-theme-btn inline-flex items-center justify-center w-10 h-10 rounded-[10px] border border-[var(--snow-border-subtle)] bg-[var(--snow-surface)] text-[var(--snow-text-secondary)] cursor-pointer transition-all duration-200 ease hover:bg-[var(--snow-surface-solid)] hover:text-[var(--snow-accent)] hover:border-[var(--snow-border)] hover:scale-105 active:scale-95"
                onClick={toggleTheme}
                title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              <button
                type="button"
                className="snow-btn-ghost inline-flex items-center justify-center px-4 py-2 rounded-[10px] text-[0.92rem] font-semibold text-[var(--snow-text-secondary)] no-underline transition-all duration-200 ease hover:text-[var(--snow-accent)] hover:bg-[var(--snow-frost-pill-bg)] max-md:hidden"
                onClick={() => setIsDemoModalOpen(true)}
              >
                Contact
              </button>

              <Link to="/login" className="snow-btn-ghost inline-flex items-center justify-center px-4 py-2 rounded-[10px] text-[0.92rem] font-semibold text-[var(--snow-text-secondary)] no-underline transition-all duration-200 ease hover:text-[var(--snow-accent)] hover:bg-[var(--snow-frost-pill-bg)] max-md:hidden">
                Sign In
              </Link>

              <Link to="/register" className="snow-btn-primary snow-nav-cta inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-[0.94rem] text-white bg-gradient-to-r from-[#0284c7] via-[#0ea5e9] to-[#38bdf8] shadow-[0_4px_16px_rgba(14,165,233,0.35)] border border-[rgba(255,255,255,0.2)] no-underline cursor-pointer transition-all duration-[250ms] ease hover:-translate-y-[2px] hover:shadow-[0_8px_24px_rgba(14,165,233,0.45)] hover:brightness-105 active:translate-y-0 active:scale-[0.99] max-sm:hidden">
                <span>Get Started</span>
                <ArrowRight size={16} />
              </Link>

              {/* Mobile Menu Toggle Button */}
              <button
                type="button"
                className="snow-mobile-toggle hidden max-lg:inline-flex items-center justify-center w-10 h-10 rounded-[10px] border border-[var(--snow-border-subtle)] bg-[var(--snow-surface)] text-[var(--snow-text-primary)] cursor-pointer transition-all duration-200 ease hover:bg-[var(--snow-surface-solid)]"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer with Backdrop */}
        {mobileMenuOpen && (
          <>
            <div
              className="snow-drawer-backdrop fixed inset-0 z-[98] bg-[rgba(11,21,40,0.45)] backdrop-blur-sm animate-[fadeIn_0.2s_ease]"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />
            <div className="snow-mobile-drawer fixed top-[74px] left-0 right-0 z-[99] bg-[var(--snow-surface-solid)] border-b border-[var(--snow-border)] p-6 flex flex-col gap-3.5 shadow-2xl animate-[slideDown_0.25s_ease]">
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-[var(--snow-text-secondary)] font-medium py-1.5 hover:text-[var(--snow-accent)]">Features</a>
              <a href="#mockup" onClick={() => setMobileMenuOpen(false)} className="text-[var(--snow-text-secondary)] font-medium py-1.5 hover:text-[var(--snow-accent)]">Product Tour</a>
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-[var(--snow-text-secondary)] font-medium py-1.5 hover:text-[var(--snow-accent)]">How It Works</a>
              <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-[var(--snow-text-secondary)] font-medium py-1.5 hover:text-[var(--snow-accent)]">Pricing</a>
              <a href="#testimonials" onClick={() => setMobileMenuOpen(false)} className="text-[var(--snow-text-secondary)] font-medium py-1.5 hover:text-[var(--snow-accent)]">Reviews</a>
              <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="text-[var(--snow-text-secondary)] font-medium py-1.5 hover:text-[var(--snow-accent)]">FAQ</a>
              <button
                type="button"
                className="snow-btn-secondary inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-[0.94rem] text-[var(--snow-text-primary)] bg-[var(--snow-surface)] border border-[var(--snow-border)] shadow-[var(--snow-card-shadow)] no-underline cursor-pointer backdrop-blur-[12px] transition-all duration-[250ms] ease hover:-translate-y-[2px] hover:border-[var(--snow-border-strong)] hover:bg-[var(--snow-surface-solid)] hover:shadow-[var(--snow-card-shadow-hover)] hover:text-[var(--snow-accent)] active:translate-y-0"
                onClick={() => {
                  setMobileMenuOpen(false)
                  setIsDemoModalOpen(true)
                }}
                style={{ width: '100%', marginTop: '8px' }}
              >
                Contact Sales
              </button>
              <Link
                to="/login"
                className="snow-btn-secondary inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-[0.94rem] text-[var(--snow-text-primary)] bg-[var(--snow-surface)] border border-[var(--snow-border)] shadow-[var(--snow-card-shadow)] no-underline cursor-pointer backdrop-blur-[12px] transition-all duration-[250ms] ease hover:-translate-y-[2px] hover:border-[var(--snow-border-strong)] hover:bg-[var(--snow-surface-solid)] hover:shadow-[var(--snow-card-shadow-hover)] hover:text-[var(--snow-accent)] active:translate-y-0"
                onClick={() => setMobileMenuOpen(false)}
                style={{ width: '100%' }}
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="snow-btn-primary inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-[0.94rem] text-white bg-gradient-to-r from-[#0284c7] via-[#0ea5e9] to-[#38bdf8] shadow-[0_4px_16px_rgba(14,165,233,0.35)] border border-[rgba(255,255,255,0.2)] no-underline cursor-pointer transition-all duration-[250ms] ease hover:-translate-y-[2px] hover:shadow-[0_8px_24px_rgba(14,165,233,0.45)] hover:brightness-105 active:translate-y-0 active:scale-[0.99]"
                onClick={() => setMobileMenuOpen(false)}
                style={{ width: '100%' }}
              >
                Get Started Free
              </Link>
            </div>
          </>
        )}
      </header>

      {/* ====================================================================
          2. HERO SECTION
          ==================================================================== */}
      <section className="snow-hero pt-[70px] pb-[60px] bg-[var(--snow-hero-mesh)] relative text-center">
        <div className="snow-container w-full max-w-[1240px] mx-auto px-6 relative z-[1] max-md:px-4">
          {/* Release Badge */}
          <div className="snow-hero-badge inline-flex items-center gap-2 bg-[var(--snow-frost-pill-bg)] border border-[var(--snow-frost-pill-border)] text-[var(--snow-frost-pill-text)] px-4 py-1.5 rounded-full text-[0.85rem] font-semibold tracking-[0.02em] mb-6 shadow-[var(--snow-pill-glow)] backdrop-blur-md">
            <span className="snow-hero-badge-dot w-[7px] h-[7px] rounded-full bg-[#10b981] shadow-[0_0_8px_#10b981] animate-[pulse-dot_2s_infinite]" />
            <span>SNOWFLEX 2.4 IS LIVE</span>
            <span style={{ opacity: 0.6 }}>•</span>
            <span>Snowflake Data Cloud Native HR & People Ops</span>
          </div>

          {/* Main Headline */}
          <h1 className="snow-hero-title text-[clamp(2.4rem,5vw,4.2rem)] font-extrabold leading-[1.12] tracking-[-0.03em] max-w-[960px] mx-auto mb-5 text-[var(--snow-text-primary)]">
            The Intelligent Operating System for <span className="snow-gradient-text bg-gradient-to-r from-[#0284c7] via-[#06b6d4] to-[#38bdf8] bg-clip-text text-transparent inline-block">Modern People Operations</span>
          </h1>

          {/* Subheadline */}
          <p className="snow-hero-subtitle text-[clamp(1.05rem,1.8vw,1.25rem)] text-[var(--snow-text-secondary)] max-w-[760px] mx-auto mb-9 font-normal leading-[1.6]">
            Unify employee profiles, automated biometric attendance, multi-tiered leave approvals,
            global payroll analytics, and real-time AI assistance on a singular, ultra-secure
            Snowflake data platform.
          </p>

          {/* CTA Buttons */}
          <div className="snow-hero-ctas flex items-center justify-center gap-4 mb-9 flex-wrap">
            <Link to="/register" className="snow-btn-primary inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-[1.05rem] text-white bg-gradient-to-r from-[#0284c7] via-[#0ea5e9] to-[#38bdf8] shadow-[0_4px_16px_rgba(14,165,233,0.35)] border border-[rgba(255,255,255,0.2)] no-underline cursor-pointer transition-all duration-[250ms] ease hover:-translate-y-[2px] hover:shadow-[0_8px_24px_rgba(14,165,233,0.45)] hover:brightness-105 active:translate-y-0 active:scale-[0.99]">
              Start 14-Day Free Trial
              <ArrowRight size={18} />
            </Link>
            <a href="#mockup" className="snow-btn-secondary inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-[1.05rem] text-[var(--snow-text-primary)] bg-[var(--snow-surface)] border border-[var(--snow-border)] shadow-[var(--snow-card-shadow)] no-underline cursor-pointer backdrop-blur-[12px] transition-all duration-[250ms] ease hover:-translate-y-[2px] hover:border-[var(--snow-border-strong)] hover:bg-[var(--snow-surface-solid)] hover:shadow-[var(--snow-card-shadow-hover)] hover:text-[var(--snow-accent)] active:translate-y-0">
              <Play size={16} fill="currentColor" />
              Explore Interactive Demo
            </a>
          </div>

          {/* Trust Strip */}
          <div className="snow-trust-strip flex items-center justify-center gap-7 mb-[54px] flex-wrap text-[0.88rem] text-[var(--snow-text-muted)]">
            <div className="snow-trust-item flex items-center gap-[7px] font-medium [&_svg]:text-[var(--snow-accent)]">
              <ShieldCheck size={18} />
              <span>SOC2 Type II Certified</span>
            </div>
            <div className="snow-trust-item flex items-center gap-[7px] font-medium [&_svg]:text-[var(--snow-accent)]">
              <Zap size={18} />
              <span>99.99% Guaranteed SLA</span>
            </div>
            <div className="snow-trust-item flex items-center gap-[7px] font-medium [&_svg]:text-[var(--snow-accent)]">
              <Server size={18} />
              <span>Native Snowflake Data Warehouse</span>
            </div>
            <div className="snow-trust-item flex items-center gap-[7px] font-medium [&_svg]:text-[var(--snow-accent)]">
              <Users size={18} />
              <span>140,000+ Active Employees</span>
            </div>
          </div>

          {/* ================================================================
              PRODUCT DASHBOARD MOCKUP (INTERACTIVE)
              ================================================================ */}
          <div className="snow-mockup-wrapper relative max-w-[1140px] mx-auto" id="mockup">
            <div className="snow-mockup-glow absolute -top-[10%] left-[5%] right-[5%] -bottom-[5%] bg-[radial-gradient(ellipse_at_center,rgba(14,165,233,0.22)_0%,transparent_70%)] blur-[50px] z-0 pointer-events-none" />

            {/* Floating 3D Depth Badges */}
            <div className="snow-floating-badge snow-float-top-right absolute top-[15%] -right-6 bg-[var(--snow-surface-solid)] border border-[var(--snow-border)] shadow-[0_16px_36px_rgba(0,0,0,0.14),0_0_15px_rgba(14,165,233,0.15)] rounded-xl p-[12px_18px] flex items-center gap-3 text-[0.85rem] font-semibold z-10 animate-[floatCard_4s_ease-in-out_infinite_alternate] max-lg:hidden">
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
              <div>
                <div style={{ color: 'var(--snow-text-primary)' }}>Leave Approved</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--snow-text-muted)' }}>Sofia Morales • 4d PTO Synced</div>
              </div>
            </div>

            <div className="snow-floating-badge snow-float-bottom-left absolute bottom-[8%] -left-6 [animation-delay:-2s] bg-[var(--snow-surface-solid)] border border-[var(--snow-border)] shadow-[0_16px_36px_rgba(0,0,0,0.14),0_0_15px_rgba(14,165,233,0.15)] rounded-xl p-[12px_18px] flex items-center gap-3 text-[0.85rem] font-semibold z-10 animate-[floatCard_4s_ease-in-out_infinite_alternate] max-lg:hidden">
              <Zap size={16} color="var(--snow-accent)" />
              <div>
                <div style={{ color: 'var(--snow-text-primary)' }}>Geofenced Clock-in</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--snow-text-muted)' }}>99.2% San Francisco HQ Verified</div>
              </div>
            </div>

            {/* Mockup Window */}
            <div className="snow-mockup-window relative z-[1] bg-[var(--snow-mockup-bg)] border border-[var(--snow-mockup-border)] rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.16),0_0_30px_rgba(14,165,233,0.12)] overflow-hidden backdrop-blur-[20px] text-left">
              {/* macOS Window Chrome */}
              <div className="snow-mockup-chrome flex items-center justify-between p-[12px_18px] bg-[rgba(14,165,233,0.04)] border-b border-[var(--snow-border-subtle)]">
                <div className="snow-window-dots flex items-center gap-[7px]">
                  <span className="snow-dot snow-dot-red w-[11px] h-[11px] rounded-full bg-[#ef4444]" />
                  <span className="snow-dot snow-dot-yellow w-[11px] h-[11px] rounded-full bg-[#f59e0b]" />
                  <span className="snow-dot snow-dot-green w-[11px] h-[11px] rounded-full bg-[#10b981]" />
                </div>
                <div className="snow-window-address flex items-center gap-2 bg-[var(--snow-surface-solid)] border border-[var(--snow-border-subtle)] rounded-[7px] px-3.5 py-1 text-[0.78rem] text-[var(--snow-text-muted)] max-sm:hidden">
                  <Lock size={12} />
                  <span>snowflex.company.cloud/dashboard</span>
                </div>
                <div className="snow-window-status flex items-center gap-1.5 text-[0.75rem] font-semibold text-[#10b981] bg-[rgba(16,185,129,0.1)] px-2.5 py-1 rounded-md">
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                  Snowflake Live (14ms)
                </div>
              </div>

              {/* View Switcher Tabs */}
              <div className="snow-mockup-tabs flex items-center gap-1 p-[10px_18px] bg-[rgba(14,165,233,0.02)] border-b border-[var(--snow-border-subtle)] overflow-x-auto">
                <button
                  type="button"
                  className={`snow-tab-btn flex items-center gap-[7px] px-3.5 py-2 rounded-lg text-[0.86rem] font-semibold text-[var(--snow-text-secondary)] bg-transparent border-0 cursor-pointer whitespace-nowrap transition-all duration-200 ease hover:bg-[var(--snow-frost-pill-bg)] hover:text-[var(--snow-accent)] ${activeMockupTab === 'overview' ? 'is-active bg-[var(--snow-accent)] text-white shadow-[0_4px_12px_var(--snow-accent-glow)]' : ''}`}
                  onClick={() => setActiveMockupTab('overview')}
                >
                  <BarChart3 size={15} />
                  Overview & Metrics
                </button>
                <button
                  type="button"
                  className={`snow-tab-btn flex items-center gap-[7px] px-3.5 py-2 rounded-lg text-[0.86rem] font-semibold text-[var(--snow-text-secondary)] bg-transparent border-0 cursor-pointer whitespace-nowrap transition-all duration-200 ease hover:bg-[var(--snow-frost-pill-bg)] hover:text-[var(--snow-accent)] ${activeMockupTab === 'attendance' ? 'is-active bg-[var(--snow-accent)] text-white shadow-[0_4px_12px_var(--snow-accent-glow)]' : ''}`}
                  onClick={() => setActiveMockupTab('attendance')}
                >
                  <Clock size={15} />
                  Smart Attendance
                </button>
                <button
                  type="button"
                  className={`snow-tab-btn flex items-center gap-[7px] px-3.5 py-2 rounded-lg text-[0.86rem] font-semibold text-[var(--snow-text-secondary)] bg-transparent border-0 cursor-pointer whitespace-nowrap transition-all duration-200 ease hover:bg-[var(--snow-frost-pill-bg)] hover:text-[var(--snow-accent)] ${activeMockupTab === 'leaves' ? 'is-active bg-[var(--snow-accent)] text-white shadow-[0_4px_12px_var(--snow-accent-glow)]' : ''}`}
                  onClick={() => setActiveMockupTab('leaves')}
                >
                  <Calendar size={15} />
                  Leave Approvals
                </button>
                <button
                  type="button"
                  className={`snow-tab-btn flex items-center gap-[7px] px-3.5 py-2 rounded-lg text-[0.86rem] font-semibold text-[var(--snow-text-secondary)] bg-transparent border-0 cursor-pointer whitespace-nowrap transition-all duration-200 ease hover:bg-[var(--snow-frost-pill-bg)] hover:text-[var(--snow-accent)] ${activeMockupTab === 'copilot' ? 'is-active bg-[var(--snow-accent)] text-white shadow-[0_4px_12px_var(--snow-accent-glow)]' : ''}`}
                  onClick={() => setActiveMockupTab('copilot')}
                >
                  <Bot size={15} />
                  AI HR Copilot
                </button>
                <button
                  type="button"
                  className={`snow-tab-btn flex items-center gap-[7px] px-3.5 py-2 rounded-lg text-[0.86rem] font-semibold text-[var(--snow-text-secondary)] bg-transparent border-0 cursor-pointer whitespace-nowrap transition-all duration-200 ease hover:bg-[var(--snow-frost-pill-bg)] hover:text-[var(--snow-accent)] ${activeMockupTab === 'payroll' ? 'is-active bg-[var(--snow-accent)] text-white shadow-[0_4px_12px_var(--snow-accent-glow)]' : ''}`}
                  onClick={() => setActiveMockupTab('payroll')}
                >
                  <DollarSign size={15} />
                  Payroll Analytics
                </button>
              </div>

              {/* Mockup Content Panels */}
              <div className="snow-mockup-body p-6 min-h-[380px] max-md:p-4">
                {/* 1. OVERVIEW TAB */}
                {activeMockupTab === 'overview' && (
                  <div>
                    <div className="snow-overview-kpis grid grid-cols-4 max-[860px]:grid-cols-2 max-sm:grid-cols-1 gap-4 mb-6">
                      <div className="snow-kpi-card bg-[var(--snow-surface-solid)] border border-[var(--snow-border)] rounded-xl p-4 flex flex-col gap-1.5 shadow-[var(--snow-card-shadow)] transition-transform duration-200 ease hover:-translate-y-0.5">
                        <div className="snow-kpi-head flex items-center justify-between text-[0.8rem] text-[var(--snow-text-muted)] font-medium">
                          <span>Total Headcount</span>
                          <Users size={16} />
                        </div>
                        <div className="snow-kpi-val text-[1.6rem] font-extrabold text-[var(--snow-text-primary)] leading-[1.1]">1,482</div>
                        <span className="snow-kpi-delta is-positive text-[#10b981] text-[0.76rem] font-semibold inline-flex items-center gap-[3px]">↑ +14.2% YoY</span>
                      </div>
                      <div className="snow-kpi-card bg-[var(--snow-surface-solid)] border border-[var(--snow-border)] rounded-xl p-4 flex flex-col gap-1.5 shadow-[var(--snow-card-shadow)] transition-transform duration-200 ease hover:-translate-y-0.5">
                        <div className="snow-kpi-head flex items-center justify-between text-[0.8rem] text-[var(--snow-text-muted)] font-medium">
                          <span>Today's Attendance</span>
                          <Clock size={16} />
                        </div>
                        <div className="snow-kpi-val text-[1.6rem] font-extrabold text-[var(--snow-text-primary)] leading-[1.1]">98.6%</div>
                        <span className="snow-kpi-delta is-positive text-[#10b981] text-[0.76rem] font-semibold inline-flex items-center gap-[3px]">1,461 active today</span>
                      </div>
                      <div className="snow-kpi-card bg-[var(--snow-surface-solid)] border border-[var(--snow-border)] rounded-xl p-4 flex flex-col gap-1.5 shadow-[var(--snow-card-shadow)] transition-transform duration-200 ease hover:-translate-y-0.5">
                        <div className="snow-kpi-head flex items-center justify-between text-[0.8rem] text-[var(--snow-text-muted)] font-medium">
                          <span>Pending Leaves</span>
                          <Calendar size={16} />
                        </div>
                        <div className="snow-kpi-val text-[1.6rem] font-extrabold text-[var(--snow-text-primary)] leading-[1.1]">8</div>
                        <span className="snow-kpi-delta is-neutral text-[var(--snow-accent)] text-[0.76rem] font-semibold inline-flex items-center gap-[3px]">Avg turnaround 1.4h</span>
                      </div>
                      <div className="snow-kpi-card bg-[var(--snow-surface-solid)] border border-[var(--snow-border)] rounded-xl p-4 flex flex-col gap-1.5 shadow-[var(--snow-card-shadow)] transition-transform duration-200 ease hover:-translate-y-0.5">
                        <div className="snow-kpi-head flex items-center justify-between text-[0.8rem] text-[var(--snow-text-muted)] font-medium">
                          <span>Payroll Run Status</span>
                          <DollarSign size={16} />
                        </div>
                        <div className="snow-kpi-val text-[1.6rem] font-extrabold text-[var(--snow-text-primary)] leading-[1.1]">$1.84M</div>
                        <span className="snow-kpi-delta is-positive text-[#10b981] text-[0.76rem] font-semibold inline-flex items-center gap-[3px]">Ready for sign-off</span>
                      </div>
                    </div>

                    <div className="snow-mockup-split grid grid-cols-[1.2fr_0.8fr] max-[860px]:grid-cols-1 gap-5">
                      {/* Live Feed */}
                      <div className="snow-panel-card bg-[var(--snow-surface-solid)] border border-[var(--snow-border-subtle)] rounded-xl p-[18px]">
                        <div className="snow-panel-title flex items-center justify-between text-[0.92rem] font-bold mb-3.5 text-[var(--snow-text-primary)]">
                          <span>Live Operational Stream</span>
                          <span className="snow-badge-pill badge-green text-[0.72rem] font-semibold px-2 py-[3px] rounded-md bg-[rgba(16,185,129,0.15)] text-[#10b981]">Real-time</span>
                        </div>
                        <div className="snow-live-feed-list flex flex-col gap-2.5">
                          <div className="snow-feed-item flex items-center justify-between p-[10px_12px] bg-[var(--snow-bg)] rounded-lg text-[0.82rem]">
                            <div className="snow-feed-info flex items-center gap-2.5">
                              <div className="snow-avatar-mini w-8 h-8 rounded-full flex items-center justify-center font-bold text-[0.78rem] text-white shrink-0" style={{ background: '#0284c7' }}>LV</div>
                              <div>
                                <strong>Liam Vance</strong>
                                <div style={{ color: 'var(--snow-text-muted)' }}>Clocked in • Seattle Hub</div>
                              </div>
                            </div>
                            <span className="snow-badge-pill badge-blue text-[0.72rem] font-semibold px-2 py-[3px] rounded-md bg-[rgba(14,165,233,0.15)] text-[var(--snow-accent)]">08:58 AM</span>
                          </div>

                          <div className="snow-feed-item flex items-center justify-between p-[10px_12px] bg-[var(--snow-bg)] rounded-lg text-[0.82rem]">
                            <div className="snow-feed-info flex items-center gap-2.5">
                              <div className="snow-avatar-mini w-8 h-8 rounded-full flex items-center justify-center font-bold text-[0.78rem] text-white shrink-0" style={{ background: '#10b981' }}>ER</div>
                              <div>
                                <strong>Elena Rostova</strong>
                                <div style={{ color: 'var(--snow-text-muted)' }}>Parental leave approved</div>
                              </div>
                            </div>
                            <span className="snow-badge-pill badge-green text-[0.72rem] font-semibold px-2 py-[3px] rounded-md bg-[rgba(16,185,129,0.15)] text-[#10b981]">Synced to DB</span>
                          </div>

                          <div className="snow-feed-item flex items-center justify-between p-[10px_12px] bg-[var(--snow-bg)] rounded-lg text-[0.82rem]">
                            <div className="snow-feed-info flex items-center gap-2.5">
                              <div className="snow-avatar-mini w-8 h-8 rounded-full flex items-center justify-center font-bold text-[0.78rem] text-white shrink-0" style={{ background: '#a855f7' }}>AI</div>
                              <div>
                                <strong>AI HR Copilot</strong>
                                <div style={{ color: 'var(--snow-text-muted)' }}>Turnover risk scan completed</div>
                              </div>
                            </div>
                            <span className="snow-badge-pill badge-purple text-[0.72rem] font-semibold px-2 py-[3px] rounded-md bg-[rgba(168,85,247,0.15)] text-[#a855f7]">0 Anomalies</span>
                          </div>
                        </div>
                      </div>

                      {/* Department Breakdown */}
                      <div className="snow-panel-card bg-[var(--snow-surface-solid)] border border-[var(--snow-border-subtle)] rounded-xl p-[18px]">
                        <div className="snow-panel-title flex items-center justify-between text-[0.92rem] font-bold mb-3.5 text-[var(--snow-text-primary)]">
                          <span>Department Staffing</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--snow-text-muted)' }}>All Nodes</span>
                        </div>
                        <div className="snow-dept-bars flex flex-col gap-3">
                          <div className="snow-dept-item flex flex-col gap-1 text-[0.8rem]">
                            <div className="snow-dept-meta flex justify-between font-semibold">
                              <span>Engineering & R&D</span>
                              <span>542 (36%)</span>
                            </div>
                            <div className="snow-dept-track h-2 bg-[var(--snow-border-subtle)] rounded-full overflow-hidden">
                              <div className="snow-dept-fill h-full rounded-full bg-gradient-to-r from-[#0284c7] to-[#38bdf8]" style={{ width: '36%' }} />
                            </div>
                          </div>
                          <div className="snow-dept-item flex flex-col gap-1 text-[0.8rem]">
                            <div className="snow-dept-meta flex justify-between font-semibold">
                              <span>Product & Design</span>
                              <span>218 (15%)</span>
                            </div>
                            <div className="snow-dept-track h-2 bg-[var(--snow-border-subtle)] rounded-full overflow-hidden">
                              <div className="snow-dept-fill h-full rounded-full bg-gradient-to-r from-[#0284c7] to-[#38bdf8]" style={{ width: '15%' }} />
                            </div>
                          </div>
                          <div className="snow-dept-item flex flex-col gap-1 text-[0.8rem]">
                            <div className="snow-dept-meta flex justify-between font-semibold">
                              <span>Sales & Customer Success</span>
                              <span>486 (33%)</span>
                            </div>
                            <div className="snow-dept-track h-2 bg-[var(--snow-border-subtle)] rounded-full overflow-hidden">
                              <div className="snow-dept-fill h-full rounded-full bg-gradient-to-r from-[#0284c7] to-[#38bdf8]" style={{ width: '33%' }} />
                            </div>
                          </div>
                          <div className="snow-dept-item flex flex-col gap-1 text-[0.8rem]">
                            <div className="snow-dept-meta flex justify-between font-semibold">
                              <span>Operations & People</span>
                              <span>236 (16%)</span>
                            </div>
                            <div className="snow-dept-track h-2 bg-[var(--snow-border-subtle)] rounded-full overflow-hidden">
                              <div className="snow-dept-fill h-full rounded-full bg-gradient-to-r from-[#0284c7] to-[#38bdf8]" style={{ width: '16%' }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. SMART ATTENDANCE TAB */}
                {activeMockupTab === 'attendance' && (
                  <div className="snow-mockup-stack flex flex-col gap-5">
                    <div className="snow-att-locations-grid grid grid-cols-3 max-[768px]:grid-cols-1 gap-4">
                      <div className="snow-panel-card bg-[var(--snow-surface-solid)] border border-[var(--snow-border-subtle)] rounded-xl p-[18px]">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <MapPin size={18} color="var(--snow-accent)" />
                          <strong>San Francisco HQ</strong>
                        </div>
                        <div className="snow-kpi-val text-[1.6rem] font-extrabold text-[var(--snow-text-primary)] leading-[1.1]">486 / 492</div>
                        <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: 4 }}>98.8% On-site verified</div>
                      </div>
                      <div className="snow-panel-card bg-[var(--snow-surface-solid)] border border-[var(--snow-border-subtle)] rounded-xl p-[18px]">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <MapPin size={18} color="var(--snow-accent)" />
                          <strong>London Hub</strong>
                        </div>
                        <div className="snow-kpi-val text-[1.6rem] font-extrabold text-[var(--snow-text-primary)] leading-[1.1]">312 / 315</div>
                        <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: 4 }}>99.0% Shift compliance</div>
                      </div>
                      <div className="snow-panel-card bg-[var(--snow-surface-solid)] border border-[var(--snow-border-subtle)] rounded-xl p-[18px]">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <Zap size={18} color="var(--snow-accent)" />
                          <strong>Remote Worldwide</strong>
                        </div>
                        <div className="snow-kpi-val text-[1.6rem] font-extrabold text-[var(--snow-text-primary)] leading-[1.1]">663 Active</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--snow-accent)', marginTop: 4 }}>IP & Token Verified</div>
                      </div>
                    </div>

                    <div className="snow-panel-card bg-[var(--snow-surface-solid)] border border-[var(--snow-border-subtle)] rounded-xl p-[18px]">
                      <div className="snow-panel-title flex items-center justify-between text-[0.92rem] font-bold mb-3.5 text-[var(--snow-text-primary)]">
                        <span>Recent Geofenced Punches</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--snow-text-muted)' }}>Auto-synced with biometric devices</span>
                      </div>
                      <div className="snow-punches-list flex flex-col gap-2.5">
                        {[
                          { name: 'Sarah Miller', dept: 'Engineering', time: '09:02 AM', status: 'In-Office (SF HQ)', method: 'FaceID Verified' },
                          { name: 'Aiden Patel', dept: 'Marketing', time: '08:55 AM', status: 'In-Office (NYC)', method: 'Mobile Geofence' },
                          { name: 'Chloe Dubois', dept: 'Product', time: '09:00 AM', status: 'Remote (Paris, FR)', method: 'Workstation Check-in' }
                        ].map((row, idx) => (
                          <div key={idx} className="snow-punch-row flex items-center justify-between p-[12px_14px] bg-[var(--snow-bg)] rounded-lg text-[0.85rem]">
                            <div className="snow-punch-user flex items-center gap-2">
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
                              <strong>{row.name}</strong>
                              <span style={{ color: 'var(--snow-text-muted)' }}>({row.dept})</span>
                            </div>
                            <div className="snow-punch-tags flex items-center gap-2 flex-wrap">
                              <span>{row.time}</span>
                              <span className="snow-badge-pill badge-blue text-[0.72rem] font-semibold px-2 py-[3px] rounded-md bg-[rgba(14,165,233,0.15)] text-[var(--snow-accent)]">{row.status}</span>
                              <span className="snow-badge-pill badge-green text-[0.72rem] font-semibold px-2 py-[3px] rounded-md bg-[rgba(16,185,129,0.15)] text-[#10b981]">{row.method}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. LEAVE APPROVALS TAB */}
                {activeMockupTab === 'leaves' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Manager Approval Inbox</h4>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--snow-text-muted)' }}>
                          Click 'Approve' to test real-time Snowflake state update
                        </p>
                      </div>
                      <span className="snow-badge-pill badge-blue text-[0.72rem] font-semibold px-2 py-[3px] rounded-md bg-[rgba(14,165,233,0.15)] text-[var(--snow-accent)]">3 Pending Review</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {[
                        {
                          id: 101,
                          name: 'Sarah Jenkins',
                          role: 'Lead Staff Architect',
                          type: 'Annual Vacation',
                          dates: 'Oct 24 - Oct 28 (5 Days)',
                          balance: '14 days remaining',
                          reason: 'Family trip to Iceland'
                        },
                        {
                          id: 102,
                          name: 'David O\'Connor',
                          role: 'Senior Product Manager',
                          type: 'Paternity Leave',
                          dates: 'Nov 01 - Dec 01 (30 Days)',
                          balance: 'Eligible for 6 weeks paid',
                          reason: 'Welcoming newborn son'
                        }
                      ].map((leave) => {
                        const isApproved = approvedLeaveId === leave.id
                        return (
                          <div key={leave.id} className="snow-leave-approval-card flex items-center justify-between p-[16px_20px] bg-[var(--snow-surface-solid)] border border-[var(--snow-border-subtle)] rounded-xl gap-4 max-md:flex-col max-md:items-start">
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                <strong style={{ fontSize: '1rem' }}>{leave.name}</strong>
                                <span style={{ fontSize: '0.8rem', color: 'var(--snow-text-muted)' }}>• {leave.role}</span>
                                <span className="snow-badge-pill badge-purple text-[0.72rem] font-semibold px-2 py-[3px] rounded-md bg-[rgba(168,85,247,0.15)] text-[#a855f7]">{leave.type}</span>
                              </div>
                              <div style={{ fontSize: '0.88rem', marginTop: 4, color: 'var(--snow-text-secondary)' }}>
                                <strong>{leave.dates}</strong> — <em>"{leave.reason}"</em>
                              </div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--snow-text-muted)', marginTop: 2 }}>
                                Policy balance: {leave.balance}
                              </div>
                            </div>

                            <div className="snow-leave-approval-actions flex items-center gap-2.5 min-w-[200px] justify-end max-md:w-full">
                              {isApproved ? (
                                <span className="snow-badge-pill badge-green text-[0.72rem] font-semibold px-2 py-[3px] rounded-md bg-[rgba(16,185,129,0.15)] text-[#10b981]" style={{ padding: '8px 16px', fontSize: '0.88rem' }}>
                                  ✓ Approved & Logged in Snowflake
                                </span>
                              ) : (
                                <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                                  <button
                                    type="button"
                                    className="snow-btn-secondary inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-[var(--snow-text-primary)] bg-[var(--snow-surface)] border border-[var(--snow-border)] shadow-[var(--snow-card-shadow)] no-underline cursor-pointer backdrop-blur-[12px] transition-all duration-[250ms] ease hover:-translate-y-[2px] hover:border-[var(--snow-border-strong)] hover:bg-[var(--snow-surface-solid)] hover:shadow-[var(--snow-card-shadow-hover)] hover:text-[var(--snow-accent)] active:translate-y-0"
                                    style={{ padding: '8px 14px', fontSize: '0.84rem', flex: 1 }}
                                    onClick={() => toast('Request sent for additional info.')}
                                  >
                                    Details
                                  </button>
                                  <button
                                    type="button"
                                    className="snow-btn-primary inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-white bg-gradient-to-r from-[#0284c7] via-[#0ea5e9] to-[#38bdf8] shadow-[0_4px_16px_rgba(14,165,233,0.35)] border border-[rgba(255,255,255,0.2)] no-underline cursor-pointer transition-all duration-[250ms] ease hover:-translate-y-[2px] hover:shadow-[0_8px_24px_rgba(14,165,233,0.45)] hover:brightness-105 active:translate-y-0 active:scale-[0.99]"
                                    style={{ padding: '8px 16px', fontSize: '0.84rem', flex: 1.5 }}
                                    onClick={() => handleApproveLeave(leave.id)}
                                  >
                                    Approve Request
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 4. AI HR COPILOT TAB */}
                {activeMockupTab === 'copilot' && (
                  <div className="snow-copilot-mockup-grid grid grid-cols-2 max-md:grid-cols-1 gap-5 items-start">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <strong style={{ fontSize: '0.92rem' }}>Sample Natural Language Queries</strong>
                      <p style={{ fontSize: '0.82rem', color: 'var(--snow-text-muted)', margin: 0 }}>
                        Click a question to test how SnowFlex AI analyzes your Snowflake HR warehouse:
                      </p>
                      {[
                        {
                          q: 'How does our engineering turnover compare to tech benchmarks?',
                          a: 'Engineering annualized turnover is currently 4.2%, which is 62% lower than the tech industry median of 11.0%. The newly implemented senior IC promotion tracks in Q2 contributed directly to retaining 98% of core contributors.'
                        },
                        {
                          q: 'Which department has the most unused PTO before year-end?',
                          a: 'The Product & Design department currently holds 482 accrued, unused vacation days (average 8.4 days/employee). Recommend issuing a scheduled reminder to encourage balanced time off before Q4 cutoff.'
                        },
                        {
                          q: 'Forecast Q4 payroll expense with scheduled promotions',
                          a: 'Factoring in 18 approved promotions and 6 new engineering hires starting November 1st, projected Q4 payroll expenditure is $5,620,400 (a +3.8% increase, well within the approved 5.0% expansion budget).'
                        }
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="snow-ai-chip bg-[var(--snow-surface-elevated)] border border-[var(--snow-border-subtle)] rounded-lg p-[10px_14px] text-[0.88rem] text-[var(--snow-text-primary)] text-left cursor-pointer flex items-center justify-between transition-all duration-200 ease hover:border-[var(--snow-accent)] hover:bg-[var(--snow-frost-pill-bg)] hover:translate-x-1"
                          onClick={() => handleSelectAiPrompt(item.q, item.a)}
                        >
                          <span>{item.q}</span>
                          <ArrowRight size={14} style={{ flexShrink: 0 }} />
                        </button>
                      ))}
                    </div>

                    <div className="snow-panel-card bg-[var(--snow-surface-solid)] border border-[var(--snow-border-subtle)] rounded-xl p-[18px]" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--snow-border-subtle)', paddingBottom: 10 }}>
                        <Bot size={18} color="var(--snow-accent)" />
                        <strong>SnowFlex AI HR Assistant</strong>
                        <span className="snow-badge-pill badge-green text-[0.72rem] font-semibold px-2 py-[3px] rounded-md bg-[rgba(16,185,129,0.15)] text-[#10b981]" style={{ marginLeft: 'auto' }}>Online</span>
                      </div>

                      <div className="snow-chat-msg-user self-end bg-[var(--snow-accent)] text-white p-[10px_16px] rounded-[14px_14px_2px_14px] text-[0.9rem] max-w-[85%]">
                        {copilotQuestion}
                      </div>

                      <div className="snow-chat-msg-ai self-start bg-[var(--snow-bg)] border border-[var(--snow-border-subtle)] text-[var(--snow-text-primary)] p-[14px_18px] rounded-[14px_14px_14px_2px] text-[0.9rem] leading-[1.5] max-w-[95%]">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontSize: '0.78rem', color: 'var(--snow-accent)' }}>
                          <Sparkles size={13} />
                          Snowflake Warehouse Telemetry
                        </div>
                        {copilotAnswer}
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. PAYROLL ANALYTICS TAB */}
                {activeMockupTab === 'payroll' && (
                  <div>
                    <div className="snow-overview-kpis grid grid-cols-4 max-[860px]:grid-cols-2 max-sm:grid-cols-1 gap-4 mb-6">
                      <div className="snow-kpi-card bg-[var(--snow-surface-solid)] border border-[var(--snow-border)] rounded-xl p-4 flex flex-col gap-1.5 shadow-[var(--snow-card-shadow)] transition-transform duration-200 ease hover:-translate-y-0.5">
                        <div className="snow-kpi-head flex items-center justify-between text-[0.8rem] text-[var(--snow-text-muted)] font-medium">Gross Payroll (Sep)</div>
                        <div className="snow-kpi-val text-[1.6rem] font-extrabold text-[var(--snow-text-primary)] leading-[1.1]">$1,842,500</div>
                        <span className="snow-kpi-delta is-positive text-[#10b981] text-[0.76rem] font-semibold inline-flex items-center gap-[3px]">1,482 Employees</span>
                      </div>
                      <div className="snow-kpi-card bg-[var(--snow-surface-solid)] border border-[var(--snow-border)] rounded-xl p-4 flex flex-col gap-1.5 shadow-[var(--snow-card-shadow)] transition-transform duration-200 ease hover:-translate-y-0.5">
                        <div className="snow-kpi-head flex items-center justify-between text-[0.8rem] text-[var(--snow-text-muted)] font-medium">Direct Deposit Net</div>
                        <div className="snow-kpi-val text-[1.6rem] font-extrabold text-[var(--snow-text-primary)] leading-[1.1]">$1,398,320</div>
                        <span className="snow-kpi-delta is-positive text-[#10b981] text-[0.76rem] font-semibold inline-flex items-center gap-[3px]">Ready for batch release</span>
                      </div>
                      <div className="snow-kpi-card bg-[var(--snow-surface-solid)] border border-[var(--snow-border)] rounded-xl p-4 flex flex-col gap-1.5 shadow-[var(--snow-card-shadow)] transition-transform duration-200 ease hover:-translate-y-0.5">
                        <div className="snow-kpi-head flex items-center justify-between text-[0.8rem] text-[var(--snow-text-muted)] font-medium">Statutory & Taxes</div>
                        <div className="snow-kpi-val text-[1.6rem] font-extrabold text-[var(--snow-text-primary)] leading-[1.1]">$328,140</div>
                        <span className="snow-kpi-delta is-neutral text-[var(--snow-accent)] text-[0.76rem] font-semibold inline-flex items-center gap-[3px]">Federal + State/Intl</span>
                      </div>
                      <div className="snow-kpi-card bg-[var(--snow-surface-solid)] border border-[var(--snow-border)] rounded-xl p-4 flex flex-col gap-1.5 shadow-[var(--snow-card-shadow)] transition-transform duration-200 ease hover:-translate-y-0.5">
                        <div className="snow-kpi-head flex items-center justify-between text-[0.8rem] text-[var(--snow-text-muted)] font-medium">Audit Verification</div>
                        <div className="snow-kpi-val text-[1.6rem] font-extrabold text-[var(--snow-text-primary)] leading-[1.1]">100%</div>
                        <span className="snow-kpi-delta is-positive text-[#10b981] text-[0.76rem] font-semibold inline-flex items-center gap-[3px]">0 ledger discrepancies</span>
                      </div>
                    </div>

                    <div className="snow-panel-card bg-[var(--snow-surface-solid)] border border-[var(--snow-border-subtle)] rounded-xl p-[18px]" style={{ padding: 18 }}>
                      <div className="snow-panel-title flex items-center justify-between text-[0.92rem] font-bold mb-3.5 text-[var(--snow-text-primary)]">
                        <span>Automated Payroll Execution Checklist</span>
                        <span className="snow-badge-pill badge-green text-[0.72rem] font-semibold px-2 py-[3px] rounded-md bg-[rgba(16,185,129,0.15)] text-[#10b981]">Audit Ready</span>
                      </div>
                      <div className="snow-payroll-checklist-grid grid grid-cols-3 max-md:grid-cols-1 gap-3.5">
                        <div style={{ padding: 12, background: 'var(--snow-bg)', borderRadius: 8, fontSize: '0.85rem' }}>
                          <div style={{ color: '#10b981', fontWeight: 700, marginBottom: 4 }}>✓ Timecards Locked</div>
                          <span style={{ color: 'var(--snow-text-muted)' }}>All overtime & punch anomalies reconciled</span>
                        </div>
                        <div style={{ padding: 12, background: 'var(--snow-bg)', borderRadius: 8, fontSize: '0.85rem' }}>
                          <div style={{ color: '#10b981', fontWeight: 700, marginBottom: 4 }}>✓ Leave Deductions</div>
                          <span style={{ color: 'var(--snow-text-muted)' }}>Unpaid leave & sick balances adjusted</span>
                        </div>
                        <div style={{ padding: 12, background: 'var(--snow-bg)', borderRadius: 8, fontSize: '0.85rem' }}>
                          <div style={{ color: '#10b981', fontWeight: 700, marginBottom: 4 }}>✓ Banking ACH / SEPA</div>
                          <span style={{ color: 'var(--snow-text-muted)' }}>Encrypted tokens verified with clearinghouse</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          3. STATS & SOCIAL PROOF SECTION
          ==================================================================== */}
      <section className="snow-stats-section py-[70px_50px] border-b border-[var(--snow-border-subtle)]" id="stats">
        <div className="snow-container w-full max-w-[1240px] mx-auto px-6 relative z-[1] max-md:px-4">
          <div className="snow-stats-grid grid grid-cols-4 max-[860px]:grid-cols-2 max-sm:grid-cols-1 gap-6 mb-[50px]">
            <div className="snow-stat-card text-center p-[24px_16px] bg-[var(--snow-surface)] border border-[var(--snow-border-subtle)] rounded-[14px] transition-all duration-[250ms] ease hover:border-[var(--snow-accent)] hover:-translate-y-[3px] hover:shadow-[var(--snow-card-shadow-hover)]">
              <div className="snow-stat-number text-[clamp(2rem,3.5vw,2.8rem)] font-extrabold leading-[1.1] bg-gradient-to-r from-[var(--snow-accent)] to-[#06b6d4] bg-clip-text text-transparent mb-2">140,000+</div>
              <div className="snow-stat-label text-[0.95rem] font-semibold text-[var(--snow-text-primary)] mb-1">Active Team Members</div>
              <div className="snow-stat-desc text-[0.8rem] text-[var(--snow-text-muted)]">Managed across 42 countries daily</div>
            </div>
            <div className="snow-stat-card text-center p-[24px_16px] bg-[var(--snow-surface)] border border-[var(--snow-border-subtle)] rounded-[14px] transition-all duration-[250ms] ease hover:border-[var(--snow-accent)] hover:-translate-y-[3px] hover:shadow-[var(--snow-card-shadow-hover)]">
              <div className="snow-stat-number text-[clamp(2rem,3.5vw,2.8rem)] font-extrabold leading-[1.1] bg-gradient-to-r from-[var(--snow-accent)] to-[#06b6d4] bg-clip-text text-transparent mb-2">99.4%</div>
              <div className="snow-stat-label text-[0.95rem] font-semibold text-[var(--snow-text-primary)] mb-1">Payroll & Time Precision</div>
              <div className="snow-stat-desc text-[0.8rem] text-[var(--snow-text-muted)]">Zero manual reconciliation headaches</div>
            </div>
            <div className="snow-stat-card text-center p-[24px_16px] bg-[var(--snow-surface)] border border-[var(--snow-border-subtle)] rounded-[14px] transition-all duration-[250ms] ease hover:border-[var(--snow-accent)] hover:-translate-y-[3px] hover:shadow-[var(--snow-card-shadow-hover)]">
              <div className="snow-stat-number text-[clamp(2rem,3.5vw,2.8rem)] font-extrabold leading-[1.1] bg-gradient-to-r from-[var(--snow-accent)] to-[#06b6d4] bg-clip-text text-transparent mb-2">3.8x</div>
              <div className="snow-stat-label text-[0.95rem] font-semibold text-[var(--snow-text-primary)] mb-1">Faster Approvals</div>
              <div className="snow-stat-desc text-[0.8rem] text-[var(--snow-text-muted)]">Multi-tier manager workflows resolved in hours</div>
            </div>
            <div className="snow-stat-card text-center p-[24px_16px] bg-[var(--snow-surface)] border border-[var(--snow-border-subtle)] rounded-[14px] transition-all duration-[250ms] ease hover:border-[var(--snow-accent)] hover:-translate-y-[3px] hover:shadow-[var(--snow-card-shadow-hover)]">
              <div className="snow-stat-number text-[clamp(2rem,3.5vw,2.8rem)] font-extrabold leading-[1.1] bg-gradient-to-r from-[var(--snow-accent)] to-[#06b6d4] bg-clip-text text-transparent mb-2">85%</div>
              <div className="snow-stat-label text-[0.95rem] font-semibold text-[var(--snow-text-primary)] mb-1">Fewer HR Tickets</div>
              <div className="snow-stat-desc text-[0.8rem] text-[var(--snow-text-muted)]">Handled automatically by AI HR Copilot</div>
            </div>
          </div>

          {/* Enterprise Logos Marquee */}
          <div className="snow-logos-wrap text-center">
            <div className="snow-logos-title text-[0.85rem] font-bold tracking-[0.08em] uppercase text-[var(--snow-text-muted)] mb-6">Trusted by Modern Enterprise People Teams Worldwide</div>
            <div className="snow-logos-row flex items-center justify-center gap-10 flex-wrap opacity-80">
              <div className="snow-client-logo flex items-center gap-2 text-[1.1rem] font-bold text-[var(--snow-text-secondary)] transition-all duration-200 ease hover:text-[var(--snow-accent)] hover:opacity-100"><Sparkles size={18} /> VORTEX CLOUD</div>
              <div className="snow-client-logo flex items-center gap-2 text-[1.1rem] font-bold text-[var(--snow-text-secondary)] transition-all duration-200 ease hover:text-[var(--snow-accent)] hover:opacity-100"><Server size={18} /> NORDIC DATA LABS</div>
              <div className="snow-client-logo flex items-center gap-2 text-[1.1rem] font-bold text-[var(--snow-text-secondary)] transition-all duration-200 ease hover:text-[var(--snow-accent)] hover:opacity-100"><Layers size={18} /> APEX GLOBAL</div>
              <div className="snow-client-logo flex items-center gap-2 text-[1.1rem] font-bold text-[var(--snow-text-secondary)] transition-all duration-200 ease hover:text-[var(--snow-accent)] hover:opacity-100"><Snowflake size={18} /> FROST TECH</div>
              <div className="snow-client-logo flex items-center gap-2 text-[1.1rem] font-bold text-[var(--snow-text-secondary)] transition-all duration-200 ease hover:text-[var(--snow-accent)] hover:opacity-100"><ShieldCheck size={18} /> AURA HEALTH</div>
              <div className="snow-client-logo flex items-center gap-2 text-[1.1rem] font-bold text-[var(--snow-text-secondary)] transition-all duration-200 ease hover:text-[var(--snow-accent)] hover:opacity-100"><Award size={18} /> SOLARIA FINANCIAL</div>
              <div className="snow-client-logo flex items-center gap-2 text-[1.1rem] font-bold text-[var(--snow-text-secondary)] transition-all duration-200 ease hover:text-[var(--snow-accent)] hover:opacity-100"><Zap size={18} /> CYBERPULSE</div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          4. FEATURES SECTION (Required 6 core features)
          ==================================================================== */}
      <section className="snow-features-section py-[90px] relative" id="features">
        <div className="snow-container w-full max-w-[1240px] mx-auto px-6 relative z-[1] max-md:px-4">
          <div className="snow-section-header text-center max-w-[760px] mx-auto mb-[54px]">
            <div className="snow-section-kicker inline-flex items-center gap-1.5 text-[0.82rem] font-bold tracking-[0.08em] uppercase text-[var(--snow-accent)] mb-3">
              <Sparkles size={14} />
              Enterprise Architecture
            </div>
            <h2 className="snow-section-title text-[clamp(2rem,3.5vw,3rem)] font-extrabold tracking-[-0.025em] text-[var(--snow-text-primary)] leading-[1.2] mb-4">
              Engineered to Run Every Facet of People Operations
            </h2>
            <p className="snow-section-desc text-[1.1rem] text-[var(--snow-text-secondary)] leading-[1.6]">
              Replace fragmented tools, fragile spreadsheets, and disconnected HRIS databases with
              a single, unified system connected directly to your enterprise data warehouse.
            </p>
          </div>

          <div className="snow-bento-grid grid grid-cols-3 max-[960px]:grid-cols-2 max-sm:grid-cols-1 gap-6">
            {/* 1. Employee Profiles */}
            <div className="snow-feature-card bg-[var(--snow-surface)] border border-[var(--snow-border-subtle)] rounded-2xl p-7 flex flex-col gap-4 shadow-[var(--snow-card-shadow)] transition-all duration-300 ease hover:-translate-y-[5px] hover:border-[var(--snow-accent)] hover:shadow-[var(--snow-card-shadow-hover)] relative overflow-hidden group">
              <div className="snow-feature-icon-box w-[52px] h-[52px] rounded-xl flex items-center justify-center bg-[var(--snow-frost-pill-bg)] text-[var(--snow-accent)] border border-[var(--snow-frost-pill-border)] shadow-[0_4px_12px_var(--snow-accent-glow)]">
                <Users size={26} />
              </div>
              <div className="snow-feature-pill self-start text-[0.72rem] font-bold tracking-[0.05em] uppercase px-2.5 py-[3px] rounded-full bg-[var(--snow-frost-pill-bg)] text-[var(--snow-accent)] border border-[var(--snow-frost-pill-border)]">Core System</div>
              <h3 className="snow-feature-title text-[1.25rem] font-bold text-[var(--snow-text-primary)] m-0">360° Employee Profiles</h3>
              <p className="snow-feature-body text-[0.95rem] text-[var(--snow-text-secondary)] leading-[1.55] m-0 grow">
                Centralize identity, contracts, emergency contacts, organizational hierarchy,
                and role permissions in an encrypted, audit-trailed master directory.
              </p>
              <ul className="snow-feature-bullets list-none p-0 m-0 flex flex-col gap-2 text-[0.88rem] text-[var(--snow-text-muted)] [&_li]:flex [&_li]:items-center [&_li]:gap-2 [&_svg]:text-[#10b981] [&_svg]:shrink-0">
                <li><Check size={15} /> Dynamic organizational charts & departmental trees</li>
                <li><Check size={15} /> Role-Based Access Control (RBAC) with audit logs</li>
                <li><Check size={15} /> Instant digital onboarding & offboarding workflows</li>
              </ul>
            </div>

            {/* 2. Attendance */}
            <div className="snow-feature-card bg-[var(--snow-surface)] border border-[var(--snow-border-subtle)] rounded-2xl p-7 flex flex-col gap-4 shadow-[var(--snow-card-shadow)] transition-all duration-300 ease hover:-translate-y-[5px] hover:border-[var(--snow-accent)] hover:shadow-[var(--snow-card-shadow-hover)] relative overflow-hidden group">
              <div className="snow-feature-icon-box w-[52px] h-[52px] rounded-xl flex items-center justify-center bg-[var(--snow-frost-pill-bg)] text-[var(--snow-accent)] border border-[var(--snow-frost-pill-border)] shadow-[0_4px_12px_var(--snow-accent-glow)]">
                <Clock size={26} />
              </div>
              <div className="snow-feature-pill self-start text-[0.72rem] font-bold tracking-[0.05em] uppercase px-2.5 py-[3px] rounded-full bg-[var(--snow-frost-pill-bg)] text-[var(--snow-accent)] border border-[var(--snow-frost-pill-border)]">Telemetry</div>
              <h3 className="snow-feature-title text-[1.25rem] font-bold text-[var(--snow-text-primary)] m-0">Smart Attendance & Shifts</h3>
              <p className="snow-feature-body text-[0.95rem] text-[var(--snow-text-secondary)] leading-[1.55] m-0 grow">
                Precision time tracking across mobile, web, and biometric terminal integrations
                with geofenced punch verification and anomaly detection.
              </p>
              <ul className="snow-feature-bullets list-none p-0 m-0 flex flex-col gap-2 text-[0.88rem] text-[var(--snow-text-muted)] [&_li]:flex [&_li]:items-center [&_li]:gap-2 [&_svg]:text-[#10b981] [&_svg]:shrink-0">
                <li><Check size={15} /> Geofencing verification for physical office hubs</li>
                <li><Check size={15} /> Real-time shift scheduling & break monitoring</li>
                <li><Check size={15} /> Automated overtime calculation & regulatory alerts</li>
              </ul>
            </div>

            {/* 3. Payroll */}
            <div className="snow-feature-card bg-[var(--snow-surface)] border border-[var(--snow-border-subtle)] rounded-2xl p-7 flex flex-col gap-4 shadow-[var(--snow-card-shadow)] transition-all duration-300 ease hover:-translate-y-[5px] hover:border-[var(--snow-accent)] hover:shadow-[var(--snow-card-shadow-hover)] relative overflow-hidden group">
              <div className="snow-feature-icon-box w-[52px] h-[52px] rounded-xl flex items-center justify-center bg-[var(--snow-frost-pill-bg)] text-[var(--snow-accent)] border border-[var(--snow-frost-pill-border)] shadow-[0_4px_12px_var(--snow-accent-glow)]">
                <DollarSign size={26} />
              </div>
              <div className="snow-feature-pill self-start text-[0.72rem] font-bold tracking-[0.05em] uppercase px-2.5 py-[3px] rounded-full bg-[var(--snow-frost-pill-bg)] text-[var(--snow-accent)] border border-[var(--snow-frost-pill-border)]">Compensation</div>
              <h3 className="snow-feature-title text-[1.25rem] font-bold text-[var(--snow-text-primary)] m-0">Automated Payroll Engine</h3>
              <p className="snow-feature-body text-[0.95rem] text-[var(--snow-text-secondary)] leading-[1.55] m-0 grow">
                Eliminate payroll friction. Synchronize timecards, commissions, bonuses,
                and statutory tax deductions with a single automated approval cycle.
              </p>
              <ul className="snow-feature-bullets list-none p-0 m-0 flex flex-col gap-2 text-[0.88rem] text-[var(--snow-text-muted)] [&_li]:flex [&_li]:items-center [&_li]:gap-2 [&_svg]:text-[#10b981] [&_svg]:shrink-0">
                <li><Check size={15} /> One-click direct deposit & multi-currency payout</li>
                <li><Check size={15} /> Automated tax withholdings & compliance filings</li>
                <li><Check size={15} /> Direct export to QuickBooks, NetSuite & SAP</li>
              </ul>
            </div>

            {/* 4. Leave Management */}
            <div className="snow-feature-card bg-[var(--snow-surface)] border border-[var(--snow-border-subtle)] rounded-2xl p-7 flex flex-col gap-4 shadow-[var(--snow-card-shadow)] transition-all duration-300 ease hover:-translate-y-[5px] hover:border-[var(--snow-accent)] hover:shadow-[var(--snow-card-shadow-hover)] relative overflow-hidden group">
              <div className="snow-feature-icon-box w-[52px] h-[52px] rounded-xl flex items-center justify-center bg-[var(--snow-frost-pill-bg)] text-[var(--snow-accent)] border border-[var(--snow-frost-pill-border)] shadow-[0_4px_12px_var(--snow-accent-glow)]">
                <Calendar size={26} />
              </div>
              <div className="snow-feature-pill self-start text-[0.72rem] font-bold tracking-[0.05em] uppercase px-2.5 py-[3px] rounded-full bg-[var(--snow-frost-pill-bg)] text-[var(--snow-accent)] border border-[var(--snow-frost-pill-border)]">Workforce Flow</div>
              <h3 className="snow-feature-title text-[1.25rem] font-bold text-[var(--snow-text-primary)] m-0">Multi-Tier Leave Management</h3>
              <p className="snow-feature-body text-[0.95rem] text-[var(--snow-text-secondary)] leading-[1.55] m-0 grow">
                Custom policies for PTO, sick days, parental leave, and bereavement with
                automated balance accruals and customizable multi-level approval hierarchies.
              </p>
              <ul className="snow-feature-bullets list-none p-0 m-0 flex flex-col gap-2 text-[0.88rem] text-[var(--snow-text-muted)] [&_li]:flex [&_li]:items-center [&_li]:gap-2 [&_svg]:text-[#10b981] [&_svg]:shrink-0">
                <li><Check size={15} /> Automated accrual rules & carryover caps</li>
                <li><Check size={15} /> Calendar clash detection & coverage warnings</li>
                <li><Check size={15} /> Real-time sync with Google Calendar & Outlook</li>
              </ul>
            </div>

            {/* 5. Performance */}
            <div className="snow-feature-card bg-[var(--snow-surface)] border border-[var(--snow-border-subtle)] rounded-2xl p-7 flex flex-col gap-4 shadow-[var(--snow-card-shadow)] transition-all duration-300 ease hover:-translate-y-[5px] hover:border-[var(--snow-accent)] hover:shadow-[var(--snow-card-shadow-hover)] relative overflow-hidden group">
              <div className="snow-feature-icon-box w-[52px] h-[52px] rounded-xl flex items-center justify-center bg-[var(--snow-frost-pill-bg)] text-[var(--snow-accent)] border border-[var(--snow-frost-pill-border)] shadow-[0_4px_12px_var(--snow-accent-glow)]">
                <Award size={26} />
              </div>
              <div className="snow-feature-pill self-start text-[0.72rem] font-bold tracking-[0.05em] uppercase px-2.5 py-[3px] rounded-full bg-[var(--snow-frost-pill-bg)] text-[var(--snow-accent)] border border-[var(--snow-frost-pill-border)]">Talent Growth</div>
              <h3 className="snow-feature-title text-[1.25rem] font-bold text-[var(--snow-text-primary)] m-0">Performance & OKR Alignment</h3>
              <p className="snow-feature-body text-[0.95rem] text-[var(--snow-text-secondary)] leading-[1.55] m-0 grow">
                Empower your leaders with continuous feedback cycles, 360-degree peer reviews,
                goal tracking, and structured promotion calibration frameworks.
              </p>
              <ul className="snow-feature-bullets list-none p-0 m-0 flex flex-col gap-2 text-[0.88rem] text-[var(--snow-text-muted)] [&_li]:flex [&_li]:items-center [&_li]:gap-2 [&_svg]:text-[#10b981] [&_svg]:shrink-0">
                <li><Check size={15} /> 1-on-1 meeting agendas and historical action logs</li>
                <li><Check size={15} /> 360-degree review cycles with confidential ratings</li>
                <li><Check size={15} /> Objective key results (OKRs) synced across teams</li>
              </ul>
            </div>

            {/* 6. Reports & Analytics */}
            <div className="snow-feature-card bg-[var(--snow-surface)] border border-[var(--snow-border-subtle)] rounded-2xl p-7 flex flex-col gap-4 shadow-[var(--snow-card-shadow)] transition-all duration-300 ease hover:-translate-y-[5px] hover:border-[var(--snow-accent)] hover:shadow-[var(--snow-card-shadow-hover)] relative overflow-hidden group">
              <div className="snow-feature-icon-box w-[52px] h-[52px] rounded-xl flex items-center justify-center bg-[var(--snow-frost-pill-bg)] text-[var(--snow-accent)] border border-[var(--snow-frost-pill-border)] shadow-[0_4px_12px_var(--snow-accent-glow)]">
                <BarChart3 size={26} />
              </div>
              <div className="snow-feature-pill self-start text-[0.72rem] font-bold tracking-[0.05em] uppercase px-2.5 py-[3px] rounded-full bg-[var(--snow-frost-pill-bg)] text-[var(--snow-accent)] border border-[var(--snow-frost-pill-border)]">Snowflake Intelligence</div>
              <h3 className="snow-feature-title text-[1.25rem] font-bold text-[var(--snow-text-primary)] m-0">Deep Reports & Snowflake Analytics</h3>
              <p className="snow-feature-body text-[0.95rem] text-[var(--snow-text-secondary)] leading-[1.55] m-0 grow">
                Harness the compute power of Snowflake Data Warehouse. Run predictive retention
                models, department labor expenditure curves, and executive headcount reports.
              </p>
              <ul className="snow-feature-bullets list-none p-0 m-0 flex flex-col gap-2 text-[0.88rem] text-[var(--snow-text-muted)] [&_li]:flex [&_li]:items-center [&_li]:gap-2 [&_svg]:text-[#10b981] [&_svg]:shrink-0">
                <li><Check size={15} /> Native SQL warehouse query engine & BI exports</li>
                <li><Check size={15} /> AI-powered flight-risk & turnover predictions</li>
                <li><Check size={15} /> Custom metric dashboards & automatic email digests</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          5. HOW IT WORKS SECTION (3-4 steps)
          ==================================================================== */}
      <section className="snow-how-section py-[90px] bg-[var(--snow-bg-subtle)] border-y border-[var(--snow-border-subtle)]" id="how-it-works">
        <div className="snow-container w-full max-w-[1240px] mx-auto px-6 relative z-[1] max-md:px-4">
          <div className="snow-section-header text-center max-w-[760px] mx-auto mb-[54px]">
            <div className="snow-section-kicker inline-flex items-center gap-1.5 text-[0.82rem] font-bold tracking-[0.08em] uppercase text-[var(--snow-accent)] mb-3">
              <Zap size={14} />
              Zero-Friction Adoption
            </div>
            <h2 className="snow-section-title text-[clamp(2rem,3.5vw,3rem)] font-extrabold tracking-[-0.025em] text-[var(--snow-text-primary)] leading-[1.2] mb-4">Get Running at Full Speed in Days, Not Months</h2>
            <p className="snow-section-desc text-[1.1rem] text-[var(--snow-text-secondary)] leading-[1.6]">
              SnowFlex was built to deploy smoothly alongside your existing systems with zero downtime
              or disruption to your employees.
            </p>
          </div>

          <div className="snow-steps-grid grid grid-cols-4 max-[960px]:grid-cols-2 max-[580px]:grid-cols-1 gap-6 relative">
            <div className="snow-step-card bg-[var(--snow-surface)] border border-[var(--snow-border-subtle)] rounded-2xl p-[28px_24px] flex flex-col gap-3.5 relative transition-all duration-[250ms] ease hover:-translate-y-1 hover:border-[var(--snow-accent)] hover:shadow-[var(--snow-card-shadow-hover)]">
              <div className="snow-step-num w-11 h-11 rounded-[10px] bg-gradient-to-br from-[#0284c7] to-[#38bdf8] text-white flex items-center justify-center font-extrabold text-[1.15rem] shadow-[0_4px_14px_var(--snow-accent-glow)]">01</div>
              <h3 className="snow-step-title text-[1.15rem] font-bold text-[var(--snow-text-primary)] m-0">Connect & Ingest Data</h3>
              <p className="snow-step-desc text-[0.92rem] text-[var(--snow-text-secondary)] leading-[1.55] m-0">
                Sync instantly with your existing Snowflake data cloud, import CSV rosters, or authenticate
                via Google Workspace / Okta SSO in under 5 minutes.
              </p>
            </div>

            <div className="snow-step-card bg-[var(--snow-surface)] border border-[var(--snow-border-subtle)] rounded-2xl p-[28px_24px] flex flex-col gap-3.5 relative transition-all duration-[250ms] ease hover:-translate-y-1 hover:border-[var(--snow-accent)] hover:shadow-[var(--snow-card-shadow-hover)]">
              <div className="snow-step-num w-11 h-11 rounded-[10px] bg-gradient-to-br from-[#0284c7] to-[#38bdf8] text-white flex items-center justify-center font-extrabold text-[1.15rem] shadow-[0_4px_14px_var(--snow-accent-glow)]">02</div>
              <h3 className="snow-step-title text-[1.15rem] font-bold text-[var(--snow-text-primary)] m-0">Set Custom Policies</h3>
              <p className="snow-step-desc text-[0.92rem] text-[var(--snow-text-secondary)] leading-[1.55] m-0">
                Configure your company's PTO accrual schedules, manager approval chains, office geofences,
                and regional holiday calendars with no coding required.
              </p>
            </div>

            <div className="snow-step-card bg-[var(--snow-surface)] border border-[var(--snow-border-subtle)] rounded-2xl p-[28px_24px] flex flex-col gap-3.5 relative transition-all duration-[250ms] ease hover:-translate-y-1 hover:border-[var(--snow-accent)] hover:shadow-[var(--snow-card-shadow-hover)]">
              <div className="snow-step-num w-11 h-11 rounded-[10px] bg-gradient-to-br from-[#0284c7] to-[#38bdf8] text-white flex items-center justify-center font-extrabold text-[1.15rem] shadow-[0_4px_14px_var(--snow-accent-glow)]">03</div>
              <h3 className="snow-step-title text-[1.15rem] font-bold text-[var(--snow-text-primary)] m-0">Empower Your People</h3>
              <p className="snow-step-desc text-[0.92rem] text-[var(--snow-text-secondary)] leading-[1.55] m-0">
                Employees self-service timecards, apply for leave, chat via department channels, and ask the
                built-in AI HR Copilot questions anytime from any device.
              </p>
            </div>

            <div className="snow-step-card bg-[var(--snow-surface)] border border-[var(--snow-border-subtle)] rounded-2xl p-[28px_24px] flex flex-col gap-3.5 relative transition-all duration-[250ms] ease hover:-translate-y-1 hover:border-[var(--snow-accent)] hover:shadow-[var(--snow-card-shadow-hover)]">
              <div className="snow-step-num w-11 h-11 rounded-[10px] bg-gradient-to-br from-[#0284c7] to-[#38bdf8] text-white flex items-center justify-center font-extrabold text-[1.15rem] shadow-[0_4px_14px_var(--snow-accent-glow)]">04</div>
              <h3 className="snow-step-title text-[1.15rem] font-bold text-[var(--snow-text-primary)] m-0">Scale with Intelligence</h3>
              <p className="snow-step-desc text-[0.92rem] text-[var(--snow-text-secondary)] leading-[1.55] m-0">
                Monitor company health in real-time, execute painless payroll runs, and surface predictive
                retention insights directly to leadership.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          6. INTERACTIVE AI COPILOT / LIVE EXPERIENCE
          ==================================================================== */}
      <section className="snow-ai-showcase py-[90px]" id="ai-copilot">
        <div className="snow-container max-w-[1280px] mx-auto px-6 max-md:px-4">
          <div className="snow-ai-box bg-[var(--snow-surface)] border border-[var(--snow-border)] rounded-[20px] p-[36px] grid grid-cols-2 max-[900px]:grid-cols-1 gap-[36px] items-center shadow-[var(--snow-card-shadow)] relative overflow-hidden">
            <div className="snow-ai-content flex flex-col gap-[16px]">
              <div className="snow-feature-pill inline-flex items-center gap-[6px] text-[0.78rem] font-bold tracking-[0.05em] uppercase text-[var(--snow-accent)] bg-[var(--snow-accent-muted)] border border-[var(--snow-border)] px-[12px] py-[4px] rounded-full self-start mb-[4px]">Built-in AI Assistant</div>
              <h3 className="text-[clamp(1.8rem,2.5vw,2.3rem)] font-extrabold tracking-[-0.02em] m-0 text-[var(--snow-text-primary)]">An HR Copilot That Truly Understands Your Workforce</h3>
              <p className="text-[var(--snow-text-secondary)] text-[1.05rem] m-0 leading-[1.6]">
                Ask questions in plain English. SnowFlex AI analyzes employee historical data,
                leave policies, and payroll metrics safely within your secure Snowflake perimeter.
              </p>
              <div className="snow-ai-chips flex flex-col gap-[8px]">
                <button
                  type="button"
                  className="snow-ai-chip bg-[var(--snow-surface-elevated)] border border-[var(--snow-border-subtle)] rounded-[8px] p-[10px_14px] text-[0.88rem] text-[var(--snow-text-primary)] text-left cursor-pointer flex items-center justify-between transition-all duration-200 hover:border-[var(--snow-accent)] hover:bg-[var(--snow-frost-pill-bg)] hover:translate-x-[4px]"
                  onClick={() => handleSelectAiPrompt(
                    'Summarize pending leave requests across EMEA offices',
                    'Currently 5 pending requests in EMEA: 3 in London (Engineering) and 2 in Dublin (Customer Support). All requests have sufficient accrued balances and no critical team schedule conflicts.'
                  )}
                >
                  <span>"Summarize pending leave requests across EMEA offices"</span>
                  <ArrowRight size={14} />
                </button>
                <button
                  type="button"
                  className="snow-ai-chip bg-[var(--snow-surface-elevated)] border border-[var(--snow-border-subtle)] rounded-[8px] p-[10px_14px] text-[0.88rem] text-[var(--snow-text-primary)] text-left cursor-pointer flex items-center justify-between transition-all duration-200 hover:border-[var(--snow-accent)] hover:bg-[var(--snow-frost-pill-bg)] hover:translate-x-[4px]"
                  onClick={() => handleSelectAiPrompt(
                    'What was our average attendance rate during last week\'s summit?',
                    'Average attendance during the Global Leadership Summit was 99.4%, with 100% check-ins recorded at the Chicago venue and zero unexcused absences.'
                  )}
                >
                  <span>"What was our average attendance rate during last week's summit?"</span>
                  <ArrowRight size={14} />
                </button>
                <button
                  type="button"
                  className="snow-ai-chip bg-[var(--snow-surface-elevated)] border border-[var(--snow-border-subtle)] rounded-[8px] p-[10px_14px] text-[0.88rem] text-[var(--snow-text-primary)] text-left cursor-pointer flex items-center justify-between transition-all duration-200 hover:border-[var(--snow-accent)] hover:bg-[var(--snow-frost-pill-bg)] hover:translate-x-[4px]"
                  onClick={() => handleSelectAiPrompt(
                    'Draft a promotion announcement for Maria Santos to Principal Architect',
                    'Maria Santos has been promoted to Principal Architect! Over the past 2 years, Maria architected our zero-downtime data pipelines and mentored 6 engineers across teams. Congratulations, Maria!'
                  )}
                >
                  <span>"Draft a promotion announcement for Maria Santos to Principal Architect"</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

            <div className="snow-ai-terminal bg-[var(--snow-surface-solid)] border border-[var(--snow-border)] rounded-[14px] p-[20px] flex flex-col gap-[14px] shadow-[0_10px_25px_rgba(0,0,0,0.08)]">
              <div className="flex items-center gap-[8px] pb-[10px] border-b border-[var(--snow-border-subtle)]">
                <Bot size={18} color="var(--snow-accent)" />
                <strong>SnowFlex Copilot Engine</strong>
                <span className="snow-badge-pill badge-green ml-auto inline-flex items-center gap-[5px] text-[0.74rem] font-bold px-[8px] py-[2px] rounded-full bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30">Snowflake RAG Active</span>
              </div>
              <div className="snow-chat-msg-user self-end bg-[var(--snow-accent)] text-white p-[10px_16px] rounded-[14px_14px_2px_14px] text-[0.9rem] max-w-[85%]">
                {copilotQuestion}
              </div>
              <div className="snow-chat-msg-ai self-start bg-[var(--snow-bg)] border border-[var(--snow-border-subtle)] text-[var(--snow-text-primary)] p-[14px_18px] rounded-[14px_14px_14px_2px] text-[0.9rem] leading-[1.5] max-w-[95%]">
                <div className="flex items-center gap-[6px] mb-[6px] text-[0.78rem] text-[var(--snow-accent)]">
                  <Sparkles size={13} />
                  Context-Aware HR Intelligence
                </div>
                {copilotAnswer}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          7. PRICING PLANS (3 TIERS)
          ==================================================================== */}
      <section className="snow-pricing-section py-[90px] bg-[var(--snow-bg-subtle)] border-y border-[var(--snow-border-subtle)]" id="pricing">
        <div className="snow-container max-w-[1280px] mx-auto px-6 max-md:px-4">
          <div className="snow-section-header text-center max-w-[760px] mx-auto mb-[54px]">
            <div className="snow-section-kicker inline-flex items-center gap-[6px] text-[0.8rem] font-bold tracking-[0.08em] uppercase text-[var(--snow-accent)] bg-[var(--snow-accent-muted)] border border-[var(--snow-border)] px-[12px] py-[5px] rounded-full mb-[14px]">
              <DollarSign size={14} />
              Transparent Pricing
            </div>
            <h2 className="snow-section-title text-[clamp(2rem,3.2vw,2.8rem)] font-extrabold tracking-[-0.03em] text-[var(--snow-text-primary)] m-0 leading-[1.2] mb-[16px]">Predictable Plans That Scale With You</h2>
            <p className="snow-section-desc text-[clamp(1rem,1.5vw,1.15rem)] text-[var(--snow-text-secondary)] m-0 leading-[1.6]">
              All plans include complete core features, bank-grade encryption, and 14-day risk-free trials.
              No hidden migration or implementation fees.
            </p>
          </div>

          {/* Monthly / Annual Toggle */}
          <div className="snow-pricing-toggle-wrap flex items-center justify-center gap-[12px] mb-[48px]">
            <div className="snow-billing-switch flex items-center bg-[var(--snow-surface)] border border-[var(--snow-border)] rounded-full p-[4px] relative">
              <button
                type="button"
                className={`snow-billing-btn p-[8px_18px] rounded-full text-[0.92rem] font-semibold border-none bg-transparent cursor-pointer transition-all duration-200 ${billingCycle === 'monthly' ? 'is-active bg-[var(--snow-accent)] text-white shadow-[0_2px_8px_var(--snow-accent-glow)]' : 'text-[var(--snow-text-secondary)]'}`}
                onClick={() => setBillingCycle('monthly')}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                className={`snow-billing-btn p-[8px_18px] rounded-full text-[0.92rem] font-semibold border-none bg-transparent cursor-pointer transition-all duration-200 ${billingCycle === 'annual' ? 'is-active bg-[var(--snow-accent)] text-white shadow-[0_2px_8px_var(--snow-accent-glow)]' : 'text-[var(--snow-text-secondary)]'}`}
                onClick={() => setBillingCycle('annual')}
              >
                Annual Billing
              </button>
            </div>
            <span className="snow-discount-pill bg-[#10b981]/15 text-[#10b981] text-[0.78rem] font-bold p-[4px_10px] rounded-full border border-[#10b981]/30">Save 20% Annually</span>
          </div>

          {/* Pricing Cards Grid */}
          <div className="snow-pricing-grid grid grid-cols-3 max-[960px]:grid-cols-1 max-[960px]:max-w-[520px] max-[960px]:mx-auto gap-[28px] items-stretch">
            {/* Tier 1: Starter */}
            <div className="snow-price-card bg-[var(--snow-surface)] border border-[var(--snow-border-subtle)] rounded-[18px] p-[34px_28px] flex flex-col shadow-[var(--snow-card-shadow)] transition-all duration-300 relative hover:-translate-y-[6px] hover:border-[var(--snow-accent)] hover:shadow-[var(--snow-card-shadow-hover)]">
              <div className="snow-price-tier text-[1.3rem] font-extrabold text-[var(--snow-text-primary)] mb-[6px]">Starter</div>
              <div className="snow-price-tagline text-[0.88rem] text-[var(--snow-text-muted)] mb-[22px] min-h-[40px]">
                Essential employee management for agile teams and growing startups up to 50 members.
              </div>
              <div className="snow-price-num-row flex items-baseline gap-[4px] mb-[24px]">
                <span className="snow-price-currency text-[1.5rem] font-bold text-[var(--snow-text-primary)]">$</span>
                <span className="snow-price-val text-[3rem] font-extrabold leading-none text-[var(--snow-text-primary)]">{billingCycle === 'annual' ? '5.60' : '7'}</span>
                <span className="snow-price-unit text-[0.88rem] text-[var(--snow-text-muted)]">/ employee / month</span>
              </div>
              <Link to="/register" className="snow-btn-secondary w-full mb-[28px] p-[12px] text-center inline-flex items-center justify-center gap-[8px] font-semibold rounded-[10px] border border-[var(--snow-border)] bg-[var(--snow-surface)] text-[var(--snow-text-primary)] transition-all duration-200 hover:border-[var(--snow-accent)] hover:bg-[var(--snow-surface-elevated)]">
                Start 14-Day Free Trial
              </Link>
              <ul className="snow-price-features-list list-none p-0 m-0 flex flex-col gap-[12px] text-[0.92rem] text-[var(--snow-text-secondary)]">
                <li className="flex items-start gap-[10px]"><CheckCircle2 size={16} className="text-[#10b981] shrink-0 mt-[2px]" /> 360° Employee Profiles & Directory</li>
                <li className="flex items-start gap-[10px]"><CheckCircle2 size={16} className="text-[#10b981] shrink-0 mt-[2px]" /> Web & Mobile Attendance Clock-In</li>
                <li className="flex items-start gap-[10px]"><CheckCircle2 size={16} className="text-[#10b981] shrink-0 mt-[2px]" /> Standard Leave Requests & Balances</li>
                <li className="flex items-start gap-[10px]"><CheckCircle2 size={16} className="text-[#10b981] shrink-0 mt-[2px]" /> Company Holiday Calendar Sync</li>
                <li className="flex items-start gap-[10px]"><CheckCircle2 size={16} className="text-[#10b981] shrink-0 mt-[2px]" /> Real-Time Live Team Chat</li>
                <li className="flex items-start gap-[10px]"><CheckCircle2 size={16} className="text-[#10b981] shrink-0 mt-[2px]" /> Standard Email Support (24h SLA)</li>
              </ul>
            </div>

            {/* Tier 2: Professional (Most Popular) */}
            <div className="snow-price-card is-popular bg-[var(--snow-surface-solid)] border-2 border-[var(--snow-accent)] rounded-[18px] p-[34px_28px] flex flex-col shadow-[0_16px_45px_-10px_var(--snow-accent-glow)] transition-all duration-300 relative hover:-translate-y-[6px] hover:shadow-[var(--snow-card-shadow-hover)]">
              <div className="snow-popular-badge absolute -top-[14px] left-1/2 -translate-x-1/2 bg-gradient-to-br from-[#0284c7] to-[#06b6d4] text-white text-[0.76rem] font-bold tracking-[0.05em] uppercase p-[4px_16px] rounded-full shadow-[0_4px_12px_var(--snow-accent-glow)]">Most Popular</div>
              <div className="snow-price-tier text-[1.3rem] font-extrabold text-[var(--snow-text-primary)] mb-[6px]">Growth & Pro</div>
              <div className="snow-price-tagline text-[0.88rem] text-[var(--snow-text-muted)] mb-[22px] min-h-[40px]">
                Complete HR automation, payroll, and AI assistance for scaling businesses up to 500 members.
              </div>
              <div className="snow-price-num-row flex items-baseline gap-[4px] mb-[24px]">
                <span className="snow-price-currency text-[1.5rem] font-bold text-[var(--snow-text-primary)]">$</span>
                <span className="snow-price-val text-[3rem] font-extrabold leading-none text-[var(--snow-text-primary)]">{billingCycle === 'annual' ? '11.20' : '14'}</span>
                <span className="snow-price-unit text-[0.88rem] text-[var(--snow-text-muted)]">/ employee / month</span>
              </div>
              <Link to="/register" className="snow-btn-primary w-full mb-[28px] p-[12px] text-center inline-flex items-center justify-center gap-[8px] font-semibold rounded-[10px] bg-[var(--snow-accent)] text-white shadow-[0_2px_8px_var(--snow-accent-glow)] transition-all duration-200 hover:bg-[var(--snow-accent-hover)] hover:-translate-y-[1px]">
                Get Started with Pro
                <ArrowRight size={16} />
              </Link>
              <ul className="snow-price-features-list list-none p-0 m-0 flex flex-col gap-[12px] text-[0.92rem] text-[var(--snow-text-secondary)]">
                <li className="flex items-start gap-[10px]"><CheckCircle2 size={16} className="text-[#10b981] shrink-0 mt-[2px]" /> <strong>Everything in Starter</strong></li>
                <li className="flex items-start gap-[10px]"><CheckCircle2 size={16} className="text-[#10b981] shrink-0 mt-[2px]" /> Automated Payroll Calculation & Tax Ledgers</li>
                <li className="flex items-start gap-[10px]"><CheckCircle2 size={16} className="text-[#10b981] shrink-0 mt-[2px]" /> Multi-Tier Manager Approval Hierarchies</li>
                <li className="flex items-start gap-[10px]"><CheckCircle2 size={16} className="text-[#10b981] shrink-0 mt-[2px]" /> Geofenced & Biometric Attendance Verification</li>
                <li className="flex items-start gap-[10px]"><CheckCircle2 size={16} className="text-[#10b981] shrink-0 mt-[2px]" /> <strong>SnowFlex AI HR Copilot & Assistant</strong></li>
                <li className="flex items-start gap-[10px]"><CheckCircle2 size={16} className="text-[#10b981] shrink-0 mt-[2px]" /> Performance OKRs & 360° Review Cycles</li>
                <li className="flex items-start gap-[10px]"><CheckCircle2 size={16} className="text-[#10b981] shrink-0 mt-[2px]" /> Advanced Analytics & Custom CSV / PDF Exports</li>
                <li className="flex items-start gap-[10px]"><CheckCircle2 size={16} className="text-[#10b981] shrink-0 mt-[2px]" /> Priority 24/7 Chat & Ticket Support</li>
              </ul>
            </div>

            {/* Tier 3: Enterprise */}
            <div className="snow-price-card bg-[var(--snow-surface)] border border-[var(--snow-border-subtle)] rounded-[18px] p-[34px_28px] flex flex-col shadow-[var(--snow-card-shadow)] transition-all duration-300 relative hover:-translate-y-[6px] hover:border-[var(--snow-accent)] hover:shadow-[var(--snow-card-shadow-hover)]">
              <div className="snow-price-tier text-[1.3rem] font-extrabold text-[var(--snow-text-primary)] mb-[6px]">Enterprise</div>
              <div className="snow-price-tagline text-[0.88rem] text-[var(--snow-text-muted)] mb-[22px] min-h-[40px]">
                Dedicated infrastructure, custom integrations, and SLA guarantees for global enterprises.
              </div>
              <div className="snow-price-num-row flex items-baseline gap-[4px] mb-[24px]">
                <span className="snow-price-currency text-[1.5rem] font-bold text-[var(--snow-text-primary)]">$</span>
                <span className="snow-price-val text-[3rem] font-extrabold leading-none text-[var(--snow-text-primary)]">{billingCycle === 'annual' ? '20.80' : '26'}</span>
                <span className="snow-price-unit text-[0.88rem] text-[var(--snow-text-muted)]">/ employee / month</span>
              </div>
              <button
                type="button"
                className="snow-btn-secondary w-full mb-[28px] p-[12px] text-center inline-flex items-center justify-center gap-[8px] font-semibold rounded-[10px] border border-[var(--snow-border)] bg-[var(--snow-surface)] text-[var(--snow-text-primary)] cursor-pointer transition-all duration-200 hover:border-[var(--snow-accent)] hover:bg-[var(--snow-surface-elevated)]"
                onClick={() => setIsDemoModalOpen(true)}
              >
                Schedule Enterprise Demo
              </button>
              <ul className="snow-price-features-list list-none p-0 m-0 flex flex-col gap-[12px] text-[0.92rem] text-[var(--snow-text-secondary)]">
                <li className="flex items-start gap-[10px]"><CheckCircle2 size={16} className="text-[#10b981] shrink-0 mt-[2px]" /> <strong>Everything in Growth & Pro</strong></li>
                <li className="flex items-start gap-[10px]"><CheckCircle2 size={16} className="text-[#10b981] shrink-0 mt-[2px]" /> <strong>Dedicated Snowflake Data Warehouse Cluster</strong></li>
                <li className="flex items-start gap-[10px]"><CheckCircle2 size={16} className="text-[#10b981] shrink-0 mt-[2px]" /> Custom SAML / SSO / Okta & SCIM Provisioning</li>
                <li className="flex items-start gap-[10px]"><CheckCircle2 size={16} className="text-[#10b981] shrink-0 mt-[2px]" /> Custom HRIS & ERP Integrations (Workday, SAP)</li>
                <li className="flex items-start gap-[10px]"><CheckCircle2 size={16} className="text-[#10b981] shrink-0 mt-[2px]" /> 99.99% Financially-Backed SLA</li>
                <li className="flex items-start gap-[10px]"><CheckCircle2 size={16} className="text-[#10b981] shrink-0 mt-[2px]" /> Dedicated Customer Success Manager</li>
                <li className="flex items-start gap-[10px]"><CheckCircle2 size={16} className="text-[#10b981] shrink-0 mt-[2px]" /> Custom Security & GDPR / HIPAA Audit Reports</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          8. TESTIMONIALS SECTION
          ==================================================================== */}
      <section className="snow-testimonials-section py-[90px]" id="testimonials">
        <div className="snow-container max-w-[1280px] mx-auto px-6 max-md:px-4">
          <div className="snow-section-header text-center max-w-[760px] mx-auto mb-[54px]">
            <div className="snow-section-kicker inline-flex items-center gap-[6px] text-[0.8rem] font-bold tracking-[0.08em] uppercase text-[var(--snow-accent)] bg-[var(--snow-accent-muted)] border border-[var(--snow-border)] px-[12px] py-[5px] rounded-full mb-[14px]">
              <Award size={14} />
              Customer Stories
            </div>
            <h2 className="snow-section-title text-[clamp(2rem,3.2vw,2.8rem)] font-extrabold tracking-[-0.03em] text-[var(--snow-text-primary)] m-0 leading-[1.2] mb-[16px]">Loved by People Teams and Employees Alike</h2>
            <p className="snow-section-desc text-[clamp(1rem,1.5vw,1.15rem)] text-[var(--snow-text-secondary)] m-0 leading-[1.6]">
              Discover how leading high-growth companies rely on SnowFlex to simplify their workplace operations.
            </p>
          </div>

          <div className="snow-testimonials-grid grid grid-cols-3 max-[960px]:grid-cols-1 max-[960px]:max-w-[580px] max-[960px]:mx-auto gap-[28px]">
            <div className="snow-testi-card bg-[var(--snow-surface)] border border-[var(--snow-border-subtle)] rounded-[16px] p-[30px] flex flex-col gap-[18px] shadow-[var(--snow-card-shadow)] transition-all duration-200 hover:-translate-y-[4px] hover:border-[var(--snow-accent)] hover:shadow-[var(--snow-card-shadow-hover)]">
              <div className="snow-stars-row flex gap-[4px] text-[#f59e0b]">
                {'★★★★★'}
              </div>
              <p className="snow-testi-quote text-[1rem] text-[var(--snow-text-secondary)] leading-[1.6] italic m-0 grow">
                "SnowFlex cut our monthly payroll processing time from four whole days down to 45 minutes.
                The live Snowflake synchronization gives our executive team total trust in our workforce numbers."
              </p>
              <div className="snow-testi-author flex items-center gap-[12px]">
                <div className="snow-avatar-mini w-[44px] h-[44px] rounded-full object-cover border-2 border-[var(--snow-border)] flex items-center justify-center font-bold text-white text-[0.88rem]" style={{ background: '#0284c7' }}>MC</div>
                <div>
                  <div className="snow-testi-name font-bold text-[0.95rem] text-[var(--snow-text-primary)]">Marcus Vance</div>
                  <div className="snow-testi-role text-[0.8rem] text-[var(--snow-text-muted)]">Chief People Officer, Vortex Cloud (1,400 employees)</div>
                </div>
              </div>
            </div>

            <div className="snow-testi-card bg-[var(--snow-surface)] border border-[var(--snow-border-subtle)] rounded-[16px] p-[30px] flex flex-col gap-[18px] shadow-[var(--snow-card-shadow)] transition-all duration-200 hover:-translate-y-[4px] hover:border-[var(--snow-accent)] hover:shadow-[var(--snow-card-shadow-hover)]">
              <div className="snow-stars-row flex gap-[4px] text-[#f59e0b]">
                {'★★★★★'}
              </div>
              <p className="snow-testi-quote text-[1rem] text-[var(--snow-text-secondary)] leading-[1.6] italic m-0 grow">
                "The AI Copilot has fundamentally changed how our managers approve leaves and check team schedules.
                Employees love that they don't have to wait days for simple HR policy answers."
              </p>
              <div className="snow-testi-author flex items-center gap-[12px]">
                <div className="snow-avatar-mini w-[44px] h-[44px] rounded-full object-cover border-2 border-[var(--snow-border)] flex items-center justify-center font-bold text-white text-[0.88rem]" style={{ background: '#06b6d4' }}>SL</div>
                <div>
                  <div className="snow-testi-name font-bold text-[0.95rem] text-[var(--snow-text-primary)]">Sonja Lindqvist</div>
                  <div className="snow-testi-role text-[0.8rem] text-[var(--snow-text-muted)]">Head of Global Talent, Nordic Data Labs</div>
                </div>
              </div>
            </div>

            <div className="snow-testi-card bg-[var(--snow-surface)] border border-[var(--snow-border-subtle)] rounded-[16px] p-[30px] flex flex-col gap-[18px] shadow-[var(--snow-card-shadow)] transition-all duration-200 hover:-translate-y-[4px] hover:border-[var(--snow-accent)] hover:shadow-[var(--snow-card-shadow-hover)]">
              <div className="snow-stars-row flex gap-[4px] text-[#f59e0b]">
                {'★★★★★'}
              </div>
              <p className="snow-testi-quote text-[1rem] text-[var(--snow-text-secondary)] leading-[1.6] italic m-0 grow">
                "Switching from our clunky legacy HRIS to SnowFlex felt like moving from dial-up to fiber optics.
                The interface is gorgeous, snappy, and our employees actually enjoy logging in."
              </p>
              <div className="snow-testi-author flex items-center gap-[12px]">
                <div className="snow-avatar-mini w-[44px] h-[44px] rounded-full object-cover border-2 border-[var(--snow-border)] flex items-center justify-center font-bold text-white text-[0.88rem]" style={{ background: '#a855f7' }}>TK</div>
                <div>
                  <div className="snow-testi-name font-bold text-[0.95rem] text-[var(--snow-text-primary)]">Tariq Khan</div>
                  <div className="snow-testi-role text-[0.8rem] text-[var(--snow-text-muted)]">VP Operations, Apex Global Technologies</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          9. FAQ SECTION
          ==================================================================== */}
      <section className="snow-faq-section py-[90px] bg-[var(--snow-bg-subtle)] border-t border-[var(--snow-border-subtle)]" id="faq">
        <div className="snow-container max-w-[1280px] mx-auto px-6 max-md:px-4">
          <div className="snow-section-header text-center max-w-[760px] mx-auto mb-[54px]">
            <div className="snow-section-kicker inline-flex items-center gap-[6px] text-[0.8rem] font-bold tracking-[0.08em] uppercase text-[var(--snow-accent)] bg-[var(--snow-accent-muted)] border border-[var(--snow-border)] px-[12px] py-[5px] rounded-full mb-[14px]">
              <MessageSquare size={14} />
              Got Questions?
            </div>
            <h2 className="snow-section-title text-[clamp(2rem,3.2vw,2.8rem)] font-extrabold tracking-[-0.03em] text-[var(--snow-text-primary)] m-0 leading-[1.2] mb-[16px]">Frequently Asked Questions</h2>
            <p className="snow-section-desc text-[clamp(1rem,1.5vw,1.15rem)] text-[var(--snow-text-secondary)] m-0 leading-[1.6]">
              Everything you need to know about SnowFlex, implementation, and security.
            </p>
          </div>

          <div className="snow-faq-accordion max-w-[820px] mx-auto flex flex-col gap-[14px]">
            {[
              {
                q: 'How does SnowFlex integrate with our Snowflake data warehouse?',
                a: 'SnowFlex natively connects to your Snowflake account via secure role-based OAuth or service credentials. All employee events (clock-ins, leaves, performance ratings, payroll ledger items) can be queried and synchronized in real time without brittle ETL batch jobs.'
              },
              {
                q: 'Can we migrate existing employee records and leave balances?',
                a: 'Yes! We provide automated CSV and Excel bulk importers, plus pre-built connectors for legacy HRIS systems like BambooHR, Workday, and ADP. Most organizations complete data migration in less than 2 business hours.'
              },
              {
                q: 'Is employee personnel and payroll data secure?',
                a: 'Security is paramount. SnowFlex adheres to SOC 2 Type II compliance, GDPR, and HIPAA data standards. All data is encrypted in transit with TLS 1.3 and at rest with AES-256 bit encryption keys managed securely in Snowflake.'
              },
              {
                q: 'Can we customize leave types and approval hierarchies per department?',
                a: 'Absolutely. You can define unlimited custom leave policies (e.g. PTO, Comp-off, Sick Leave, Parental, Study Leave) with unique accrual rates, probationary waiting periods, and multi-tier approval chains tailored to specific regional offices or departments.'
              },
              {
                q: 'How does the AI Assistant safeguard confidential compensation data?',
                a: 'The SnowFlex AI HR Copilot strictly inherits user Role-Based Access Controls (RBAC). A regular team member cannot query salary benchmarks or confidential manager notes. Only authorized executives or HR administrators can access compensation analytics.'
              },
              {
                q: 'What happens after the 14-day free trial ends?',
                a: 'You can test all Pro features completely free for 14 days with no credit card required. At the end of the trial, you can choose the plan that best fits your headcount or pause your account with zero penalty.'
              }
            ].map((faq, index) => {
              const isOpen = openFaq === index
              return (
                <div key={index} className={`snow-faq-item bg-[var(--snow-surface)] border rounded-[12px] overflow-hidden transition-all duration-200 ${isOpen ? 'is-open border-[var(--snow-accent)] shadow-[var(--snow-card-shadow)]' : 'border-[var(--snow-border-subtle)]'}`}>
                  <button
                    type="button"
                    className="snow-faq-trigger w-full flex items-center justify-between p-[20px_24px] bg-transparent border-none text-[1.05rem] font-bold text-[var(--snow-text-primary)] text-left cursor-pointer gap-[16px]"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    aria-expanded={isOpen}
                  >
                    <span>{faq.q}</span>
                    <ChevronDown size={20} className={`text-[var(--snow-accent)] shrink-0 transition-transform duration-250 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="snow-faq-answer p-[0_24px_20px] text-[0.96rem] text-[var(--snow-text-secondary)] leading-[1.6]">
                      {faq.a}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ====================================================================
          10. FINAL CTA BANNER
          ==================================================================== */}
      <section className="snow-final-cta-section py-[90px] relative">
        <div className="snow-container max-w-[1280px] mx-auto px-6 max-md:px-4">
          <div className="snow-cta-card relative bg-gradient-to-br from-[#0284c7] via-[#0369a1] to-[#0c4a6e] rounded-[24px] p-[clamp(40px,6vw,70px)] text-white text-center shadow-[0_25px_60px_-15px_rgba(2,132,199,0.45)] overflow-hidden">
            <div className="snow-cta-card-content relative z-[1] max-w-[780px] mx-auto">
              <h2 className="snow-cta-title text-[clamp(2.2rem,4vw,3.2rem)] font-extrabold leading-[1.15] mb-[18px] tracking-[-0.025em]">
                Ready to Transform Your Workforce Operations?
              </h2>
              <p className="snow-cta-desc text-[clamp(1.05rem,1.8vw,1.25rem)] opacity-90 leading-[1.6] mb-[34px]">
                Join over 2,000+ forward-thinking organizations scaling faster, reducing HR overhead,
                and delighting employees with SnowFlex.
              </p>
              <div className="snow-cta-actions flex items-center justify-center gap-[16px] mb-[24px] flex-wrap">
                <Link to="/register" className="snow-btn-cta-white inline-flex items-center gap-[8px] no-underline bg-white !text-[#0369a1] text-[1.05rem] font-bold p-[14px_28px] rounded-[10px] shadow-[0_8px_24px_rgba(0,0,0,0.18)] transition-all duration-250 hover:-translate-y-[2px] hover:bg-[#f0f9ff] hover:shadow-[0_12px_30px_rgba(0,0,0,0.25)]">
                  Get Started Free
                  <ArrowRight size={18} />
                </Link>
                <button
                  type="button"
                  className="snow-btn-cta-outline inline-flex items-center gap-[8px] no-underline bg-white/[0.12] !text-white border border-white/[0.35] text-[1.05rem] font-semibold p-[14px_28px] rounded-[10px] backdrop-blur-[8px] transition-all duration-250 cursor-pointer hover:bg-white/[0.22] hover:-translate-y-[2px]"
                  onClick={() => setIsDemoModalOpen(true)}
                >
                  Schedule Enterprise Demo
                </button>
              </div>
              <div className="snow-cta-footnotes flex items-center justify-center gap-[20px] text-[0.85rem] opacity-80 flex-wrap">
                <span>✓ 14-day free trial</span>
                <span>✓ No credit card required</span>
                <span>✓ Instant 3-minute setup</span>
                <span>✓ Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          11. FOOTER
          ==================================================================== */}
      <footer className="snow-footer bg-[var(--snow-surface-solid)] border-t border-[var(--snow-border-subtle)] pt-[70px] pb-[30px]">
        <div className="snow-container max-w-[1280px] mx-auto px-6 max-md:px-4">
          <div className="snow-footer-grid grid grid-cols-[1.8fr_1fr_1fr_1fr_1fr] max-[960px]:grid-cols-2 max-[580px]:grid-cols-1 gap-[40px] mb-[54px]">
            <div className="snow-footer-brand flex flex-col gap-[14px]">
              <Link to="/" className="snow-brand-link flex items-center gap-[10px] no-underline">
                <span className="snow-logo-mark w-[38px] h-[38px] rounded-[10px] bg-gradient-to-br from-[#0284c7] to-[#06b6d4] text-white flex items-center justify-center shadow-[0_4px_12px_var(--snow-accent-glow)]">
                  <Snowflake size={20} strokeWidth={2.4} />
                </span>
                <span className="snow-brand-title font-extrabold text-[1.3rem] tracking-[-0.03em] text-[var(--snow-text-primary)]">snowflex</span>
              </Link>
              <p className="snow-footer-tagline text-[0.92rem] text-[var(--snow-text-secondary)] leading-[1.55] max-w-[290px]">
                The next-generation People Operations and Employee Management System powered
                by Snowflake Data Cloud.
              </p>
              <div className="snow-status-pill inline-flex items-center gap-[7px] text-[0.78rem] font-semibold text-[#10b981] bg-[#10b981]/10 p-[4px_10px] rounded-full self-start">
                <span className="w-[6px] h-[6px] rounded-full bg-[#10b981]" />
                <span>Snowflake Cloud: 99.99% Live</span>
              </div>
            </div>

            <div className="snow-footer-col flex flex-col gap-[14px]">
              <div className="snow-footer-heading text-[0.88rem] font-bold tracking-[0.05em] uppercase text-[var(--snow-text-primary)]">Product</div>
              <ul className="snow-footer-links list-none p-0 m-0 flex flex-col gap-[10px] text-[0.9rem]">
                <li><a href="#features" className="no-underline text-[var(--snow-text-secondary)] transition-colors duration-200 hover:text-[var(--snow-accent)]">Employee Profiles</a></li>
                <li><a href="#features" className="no-underline text-[var(--snow-text-secondary)] transition-colors duration-200 hover:text-[var(--snow-accent)]">Smart Attendance</a></li>
                <li><a href="#features" className="no-underline text-[var(--snow-text-secondary)] transition-colors duration-200 hover:text-[var(--snow-accent)]">Automated Payroll</a></li>
                <li><a href="#features" className="no-underline text-[var(--snow-text-secondary)] transition-colors duration-200 hover:text-[var(--snow-accent)]">Leave Management</a></li>
                <li><a href="#features" className="no-underline text-[var(--snow-text-secondary)] transition-colors duration-200 hover:text-[var(--snow-accent)]">Performance & OKRs</a></li>
                <li><a href="#features" className="no-underline text-[var(--snow-text-secondary)] transition-colors duration-200 hover:text-[var(--snow-accent)]">Reports & Telemetry</a></li>
              </ul>
            </div>

            <div className="snow-footer-col flex flex-col gap-[14px]">
              <div className="snow-footer-heading text-[0.88rem] font-bold tracking-[0.05em] uppercase text-[var(--snow-text-primary)]">Solutions</div>
              <ul className="snow-footer-links list-none p-0 m-0 flex flex-col gap-[10px] text-[0.9rem]">
                <li><a href="#pricing" className="no-underline text-[var(--snow-text-secondary)] transition-colors duration-200 hover:text-[var(--snow-accent)]">For Fast-Growing Startups</a></li>
                <li><a href="#pricing" className="no-underline text-[var(--snow-text-secondary)] transition-colors duration-200 hover:text-[var(--snow-accent)]">For Global Enterprises</a></li>
                <li><a href="#features" className="no-underline text-[var(--snow-text-secondary)] transition-colors duration-200 hover:text-[var(--snow-accent)]">For Hybrid & Remote Teams</a></li>
                <li><a href="#features" className="no-underline text-[var(--snow-text-secondary)] transition-colors duration-200 hover:text-[var(--snow-accent)]">Data Warehouse Sync</a></li>
                <li><a href="#features" className="no-underline text-[var(--snow-text-secondary)] transition-colors duration-200 hover:text-[var(--snow-accent)]">Compliance & Audits</a></li>
              </ul>
            </div>

            <div className="snow-footer-col flex flex-col gap-[14px]">
              <div className="snow-footer-heading text-[0.88rem] font-bold tracking-[0.05em] uppercase text-[var(--snow-text-primary)]">Resources</div>
              <ul className="snow-footer-links list-none p-0 m-0 flex flex-col gap-[10px] text-[0.9rem]">
                <li><a href="#faq" className="no-underline text-[var(--snow-text-secondary)] transition-colors duration-200 hover:text-[var(--snow-accent)]">Help Center</a></li>
                <li><a href="#mockup" className="no-underline text-[var(--snow-text-secondary)] transition-colors duration-200 hover:text-[var(--snow-accent)]">Product Tour</a></li>
                <li><a href="#faq" className="no-underline text-[var(--snow-text-secondary)] transition-colors duration-200 hover:text-[var(--snow-accent)]">Security & SOC2</a></li>
                <li><a href="#faq" className="no-underline text-[var(--snow-text-secondary)] transition-colors duration-200 hover:text-[var(--snow-accent)]">API Documentation</a></li>
                <li><a href="#pricing" className="no-underline text-[var(--snow-text-secondary)] transition-colors duration-200 hover:text-[var(--snow-accent)]">Pricing Plans</a></li>
              </ul>
            </div>

            <div className="snow-footer-col flex flex-col gap-[14px]">
              <div className="snow-footer-heading text-[0.88rem] font-bold tracking-[0.05em] uppercase text-[var(--snow-text-primary)]">Company</div>
              <ul className="snow-footer-links list-none p-0 m-0 flex flex-col gap-[10px] text-[0.9rem]">
                <li><Link to="/login" className="no-underline text-[var(--snow-text-secondary)] transition-colors duration-200 hover:text-[var(--snow-accent)]">Sign In</Link></li>
                <li><Link to="/register" className="no-underline text-[var(--snow-text-secondary)] transition-colors duration-200 hover:text-[var(--snow-accent)]">Create Account</Link></li>
                <li><button type="button" onClick={() => setIsDemoModalOpen(true)} className="no-underline text-[var(--snow-text-secondary)] transition-colors duration-200 hover:text-[var(--snow-accent)] bg-transparent border-none p-0 font-inherit cursor-pointer text-left">Contact Sales</button></li>
                <li><a href="#testimonials" className="no-underline text-[var(--snow-text-secondary)] transition-colors duration-200 hover:text-[var(--snow-accent)]">Customer Stories</a></li>
                <li><a href="#faq" className="no-underline text-[var(--snow-text-secondary)] transition-colors duration-200 hover:text-[var(--snow-accent)]">Privacy & Terms</a></li>
              </ul>
            </div>
          </div>

          <div className="snow-footer-bottom flex items-center justify-between pt-[30px] border-t border-[var(--snow-border-subtle)] text-[0.85rem] text-[var(--snow-text-muted)] flex-wrap gap-[16px]">
            <div>
              © 2026 SnowFlex People Operations Inc. All rights reserved.
            </div>
            <div className="snow-social-links flex items-center gap-[16px]">
              <a href="https://github.com" target="_blank" rel="noreferrer" className="snow-social-icon text-[var(--snow-text-muted)] transition-all duration-200 hover:text-[var(--snow-accent)] hover:-translate-y-[2px]" aria-label="GitHub">
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noreferrer" className="snow-social-icon text-[var(--snow-text-muted)] transition-all duration-200 hover:text-[var(--snow-accent)] hover:-translate-y-[2px]" aria-label="X Twitter">
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="snow-social-icon text-[var(--snow-text-muted)] transition-all duration-200 hover:text-[var(--snow-accent)] hover:-translate-y-[2px]" aria-label="LinkedIn">
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* ====================================================================
          12. CONTACT / ENTERPRISE DEMO MODAL
          ==================================================================== */}
      {isDemoModalOpen && (
        <div className="snow-modal-backdrop fixed inset-0 bg-black/65 backdrop-blur-[8px] z-[1000] flex items-center justify-center p-[20px] animate-[fadeIn_0.2s_ease-out]" onClick={() => setIsDemoModalOpen(false)}>
          <div className="snow-modal-card bg-[var(--snow-surface-solid)] border border-[var(--snow-border)] rounded-[20px] w-full max-w-[520px] shadow-[0_25px_60px_rgba(0,0,0,0.3)] overflow-hidden relative animate-[scaleUp_0.25s_cubic-bezier(0.16,1,0.3,1)]" onClick={(e) => e.stopPropagation()}>
            <div className="snow-modal-header p-[24px_28px_16px] flex items-start justify-between border-b border-[var(--snow-border-subtle)]">
              <div>
                <h3 className="snow-modal-title text-[1.35rem] font-extrabold text-[var(--snow-text-primary)] mb-[4px]">Schedule an Enterprise Walkthrough</h3>
                <p className="snow-modal-subtitle text-[0.88rem] text-[var(--snow-text-muted)] m-0">
                  Connect with a SnowFlex solutions architect to explore dedicated Snowflake deployment.
                </p>
              </div>
              <button
                type="button"
                className="snow-modal-close bg-transparent border-none text-[var(--snow-text-muted)] cursor-pointer p-[6px] rounded-[8px] transition-all duration-200 hover:bg-[var(--snow-frost-pill-bg)] hover:text-[var(--snow-text-primary)]"
                onClick={() => setIsDemoModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitDemo} className="snow-modal-form p-[24px_28px_28px] flex flex-col gap-[16px]">
              <div className="snow-form-group flex flex-col gap-[6px]">
                <label className="snow-form-label text-[0.86rem] font-semibold text-[var(--snow-text-primary)]">Full Name</label>
                <input
                  type="text"
                  required
                  className="snow-form-input w-full p-[10px_14px] rounded-[8px] border border-[var(--snow-border)] bg-[var(--snow-bg)] text-[var(--snow-text-primary)] text-[0.92rem] outline-none transition-[border-color,box-shadow] duration-200 focus:border-[var(--snow-accent)] focus:ring-3 focus:ring-[var(--snow-accent-glow)]"
                  placeholder="e.g. Jane Doe"
                  value={demoForm.name}
                  onChange={(e) => setDemoForm({ ...demoForm, name: e.target.value })}
                />
              </div>

              <div className="snow-form-group flex flex-col gap-[6px]">
                <label className="snow-form-label text-[0.86rem] font-semibold text-[var(--snow-text-primary)]">Work Email</label>
                <input
                  type="email"
                  required
                  className="snow-form-input w-full p-[10px_14px] rounded-[8px] border border-[var(--snow-border)] bg-[var(--snow-bg)] text-[var(--snow-text-primary)] text-[0.92rem] outline-none transition-[border-color,box-shadow] duration-200 focus:border-[var(--snow-accent)] focus:ring-3 focus:ring-[var(--snow-accent-glow)]"
                  placeholder="jane@company.com"
                  value={demoForm.email}
                  onChange={(e) => setDemoForm({ ...demoForm, email: e.target.value })}
                />
              </div>

              <div className="snow-form-group flex flex-col gap-[6px]">
                <label className="snow-form-label text-[0.86rem] font-semibold text-[var(--snow-text-primary)]">Company Name</label>
                <input
                  type="text"
                  className="snow-form-input w-full p-[10px_14px] rounded-[8px] border border-[var(--snow-border)] bg-[var(--snow-bg)] text-[var(--snow-text-primary)] text-[0.92rem] outline-none transition-[border-color,box-shadow] duration-200 focus:border-[var(--snow-accent)] focus:ring-3 focus:ring-[var(--snow-accent-glow)]"
                  placeholder="e.g. Acme Corp"
                  value={demoForm.company}
                  onChange={(e) => setDemoForm({ ...demoForm, company: e.target.value })}
                />
              </div>

              <div className="snow-form-group flex flex-col gap-[6px]">
                <label className="snow-form-label text-[0.86rem] font-semibold text-[var(--snow-text-primary)]">Current Employee Headcount</label>
                <select
                  className="snow-form-select w-full p-[10px_14px] rounded-[8px] border border-[var(--snow-border)] bg-[var(--snow-bg)] text-[var(--snow-text-primary)] text-[0.92rem] outline-none transition-[border-color,box-shadow] duration-200 focus:border-[var(--snow-accent)] focus:ring-3 focus:ring-[var(--snow-accent-glow)]"
                  value={demoForm.size}
                  onChange={(e) => setDemoForm({ ...demoForm, size: e.target.value })}
                >
                  <option value="1-50">1 - 50 Employees</option>
                  <option value="50-250">50 - 250 Employees</option>
                  <option value="250-1000">250 - 1,000 Employees</option>
                  <option value="1000+">1,000+ Global Employees</option>
                </select>
              </div>

              <div className="snow-form-group flex flex-col gap-[6px]">
                <label className="snow-form-label text-[0.86rem] font-semibold text-[var(--snow-text-primary)]">Specific Requirements (Optional)</label>
                <textarea
                  className="snow-form-textarea w-full p-[10px_14px] rounded-[8px] border border-[var(--snow-border)] bg-[var(--snow-bg)] text-[var(--snow-text-primary)] text-[0.92rem] outline-none transition-[border-color,box-shadow] duration-200 focus:border-[var(--snow-accent)] focus:ring-3 focus:ring-[var(--snow-accent-glow)]"
                  rows={3}
                  placeholder="e.g. Migrating from BambooHR, need biometric attendance integration..."
                  value={demoForm.message}
                  onChange={(e) => setDemoForm({ ...demoForm, message: e.target.value })}
                />
              </div>

              <button
                type="submit"
                className="snow-btn-primary w-full mt-[6px] inline-flex items-center justify-center gap-[8px] font-semibold rounded-[10px] p-[12px] bg-[var(--snow-accent)] text-white shadow-[0_2px_8px_var(--snow-accent-glow)] transition-all duration-200 hover:bg-[var(--snow-accent-hover)] hover:-translate-y-[1px] disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={submittingDemo}
              >
                {submittingDemo ? 'Submitting Request…' : 'Confirm Enterprise Request'}
                <ArrowRight size={16} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
