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
    <div className="snow-landing">
      {/* ====================================================================
          1. STICKY NAVBAR
          ==================================================================== */}
      <header className={`snow-navbar ${isScrolled ? 'is-scrolled' : ''}`}>
        <div className="snow-container">
          <div className="snow-nav-inner">
            {/* Brand Logo */}
            <Link to="/" className="snow-brand-link">
              <span className="snow-logo-mark">
                <Snowflake size={22} strokeWidth={2.4} />
              </span>
              <div className="snow-brand-text">
                <span className="snow-brand-title">snowflex</span>
                <span className="snow-brand-badge">ENTERPRISE PEOPLE OPS</span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav aria-label="Main Navigation">
              <ul className="snow-nav-links">
                <li><a href="#features" className="snow-nav-link">Features</a></li>
                <li><a href="#mockup" className="snow-nav-link">Product Tour</a></li>
                <li><a href="#how-it-works" className="snow-nav-link">How It Works</a></li>
                <li><a href="#pricing" className="snow-nav-link">Pricing</a></li>
                <li><a href="#testimonials" className="snow-nav-link">Reviews</a></li>
                <li><a href="#faq" className="snow-nav-link">FAQ</a></li>
              </ul>
            </nav>

            {/* Navbar Actions */}
            <div className="snow-nav-actions">
              <button
                type="button"
                className="snow-theme-btn"
                onClick={toggleTheme}
                title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              <button
                type="button"
                className="snow-btn-ghost"
                onClick={() => setIsDemoModalOpen(true)}
              >
                Contact
              </button>

              <Link to="/login" className="snow-btn-ghost">
                Sign In
              </Link>

              <Link to="/register" className="snow-btn-primary snow-nav-cta">
                <span>Get Started</span>
                <ArrowRight size={16} />
              </Link>

              {/* Mobile Menu Toggle Button */}
              <button
                type="button"
                className="snow-mobile-toggle"
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
              className="snow-drawer-backdrop"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />
            <div className="snow-mobile-drawer">
              <a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
              <a href="#mockup" onClick={() => setMobileMenuOpen(false)}>Product Tour</a>
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
              <a href="#pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
              <a href="#testimonials" onClick={() => setMobileMenuOpen(false)}>Reviews</a>
              <a href="#faq" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
              <button
                type="button"
                className="snow-btn-secondary"
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
                className="snow-btn-secondary"
                onClick={() => setMobileMenuOpen(false)}
                style={{ width: '100%' }}
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="snow-btn-primary"
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
      <section className="snow-hero">
        <div className="snow-container">
          {/* Release Badge */}
          <div className="snow-hero-badge">
            <span className="snow-hero-badge-dot" />
            <span>SNOWFLEX 2.4 IS LIVE</span>
            <span style={{ opacity: 0.6 }}>•</span>
            <span>Snowflake Data Cloud Native HR & People Ops</span>
          </div>

          {/* Main Headline */}
          <h1 className="snow-hero-title">
            The Intelligent Operating System for <span className="snow-gradient-text">Modern People Operations</span>
          </h1>

          {/* Subheadline */}
          <p className="snow-hero-subtitle">
            Unify employee profiles, automated biometric attendance, multi-tiered leave approvals,
            global payroll analytics, and real-time AI assistance on a singular, ultra-secure
            Snowflake data platform.
          </p>

          {/* CTA Buttons */}
          <div className="snow-hero-ctas">
            <Link to="/register" className="snow-btn-primary">
              Start 14-Day Free Trial
              <ArrowRight size={18} />
            </Link>
            <a href="#mockup" className="snow-btn-secondary">
              <Play size={16} fill="currentColor" />
              Explore Interactive Demo
            </a>
          </div>

          {/* Trust Strip */}
          <div className="snow-trust-strip">
            <div className="snow-trust-item">
              <ShieldCheck size={18} />
              <span>SOC2 Type II Certified</span>
            </div>
            <div className="snow-trust-item">
              <Zap size={18} />
              <span>99.99% Guaranteed SLA</span>
            </div>
            <div className="snow-trust-item">
              <Server size={18} />
              <span>Native Snowflake Data Warehouse</span>
            </div>
            <div className="snow-trust-item">
              <Users size={18} />
              <span>140,000+ Active Employees</span>
            </div>
          </div>

          {/* ================================================================
              PRODUCT DASHBOARD MOCKUP (INTERACTIVE)
              ================================================================ */}
          <div className="snow-mockup-wrapper" id="mockup">
            <div className="snow-mockup-glow" />

            {/* Floating 3D Depth Badges */}
            <div className="snow-floating-badge snow-float-top-right">
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
              <div>
                <div style={{ color: 'var(--snow-text-primary)' }}>Leave Approved</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--snow-text-muted)' }}>Sofia Morales • 4d PTO Synced</div>
              </div>
            </div>

            <div className="snow-floating-badge snow-float-bottom-left">
              <Zap size={16} color="var(--snow-accent)" />
              <div>
                <div style={{ color: 'var(--snow-text-primary)' }}>Geofenced Clock-in</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--snow-text-muted)' }}>99.2% San Francisco HQ Verified</div>
              </div>
            </div>

            {/* Mockup Window */}
            <div className="snow-mockup-window">
              {/* macOS Window Chrome */}
              <div className="snow-mockup-chrome">
                <div className="snow-window-dots">
                  <span className="snow-dot snow-dot-red" />
                  <span className="snow-dot snow-dot-yellow" />
                  <span className="snow-dot snow-dot-green" />
                </div>
                <div className="snow-window-address">
                  <Lock size={12} />
                  <span>snowflex.company.cloud/dashboard</span>
                </div>
                <div className="snow-window-status">
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                  Snowflake Live (14ms)
                </div>
              </div>

              {/* View Switcher Tabs */}
              <div className="snow-mockup-tabs">
                <button
                  type="button"
                  className={`snow-tab-btn ${activeMockupTab === 'overview' ? 'is-active' : ''}`}
                  onClick={() => setActiveMockupTab('overview')}
                >
                  <BarChart3 size={15} />
                  Overview & Metrics
                </button>
                <button
                  type="button"
                  className={`snow-tab-btn ${activeMockupTab === 'attendance' ? 'is-active' : ''}`}
                  onClick={() => setActiveMockupTab('attendance')}
                >
                  <Clock size={15} />
                  Smart Attendance
                </button>
                <button
                  type="button"
                  className={`snow-tab-btn ${activeMockupTab === 'leaves' ? 'is-active' : ''}`}
                  onClick={() => setActiveMockupTab('leaves')}
                >
                  <Calendar size={15} />
                  Leave Approvals
                </button>
                <button
                  type="button"
                  className={`snow-tab-btn ${activeMockupTab === 'copilot' ? 'is-active' : ''}`}
                  onClick={() => setActiveMockupTab('copilot')}
                >
                  <Bot size={15} />
                  AI HR Copilot
                </button>
                <button
                  type="button"
                  className={`snow-tab-btn ${activeMockupTab === 'payroll' ? 'is-active' : ''}`}
                  onClick={() => setActiveMockupTab('payroll')}
                >
                  <DollarSign size={15} />
                  Payroll Analytics
                </button>
              </div>

              {/* Mockup Content Panels */}
              <div className="snow-mockup-body">
                {/* 1. OVERVIEW TAB */}
                {activeMockupTab === 'overview' && (
                  <div>
                    <div className="snow-overview-kpis">
                      <div className="snow-kpi-card">
                        <div className="snow-kpi-head">
                          <span>Total Headcount</span>
                          <Users size={16} />
                        </div>
                        <div className="snow-kpi-val">1,482</div>
                        <span className="snow-kpi-delta is-positive">↑ +14.2% YoY</span>
                      </div>
                      <div className="snow-kpi-card">
                        <div className="snow-kpi-head">
                          <span>Today's Attendance</span>
                          <Clock size={16} />
                        </div>
                        <div className="snow-kpi-val">98.6%</div>
                        <span className="snow-kpi-delta is-positive">1,461 active today</span>
                      </div>
                      <div className="snow-kpi-card">
                        <div className="snow-kpi-head">
                          <span>Pending Leaves</span>
                          <Calendar size={16} />
                        </div>
                        <div className="snow-kpi-val">8</div>
                        <span className="snow-kpi-delta is-neutral">Avg turnaround 1.4h</span>
                      </div>
                      <div className="snow-kpi-card">
                        <div className="snow-kpi-head">
                          <span>Payroll Run Status</span>
                          <DollarSign size={16} />
                        </div>
                        <div className="snow-kpi-val">$1.84M</div>
                        <span className="snow-kpi-delta is-positive">Ready for sign-off</span>
                      </div>
                    </div>

                    <div className="snow-mockup-split">
                      {/* Live Feed */}
                      <div className="snow-panel-card">
                        <div className="snow-panel-title">
                          <span>Live Operational Stream</span>
                          <span className="snow-badge-pill badge-green">Real-time</span>
                        </div>
                        <div className="snow-live-feed-list">
                          <div className="snow-feed-item">
                            <div className="snow-feed-info">
                              <div className="snow-avatar-mini" style={{ background: '#0284c7' }}>LV</div>
                              <div>
                                <strong>Liam Vance</strong>
                                <div style={{ color: 'var(--snow-text-muted)' }}>Clocked in • Seattle Hub</div>
                              </div>
                            </div>
                            <span className="snow-badge-pill badge-blue">08:58 AM</span>
                          </div>

                          <div className="snow-feed-item">
                            <div className="snow-feed-info">
                              <div className="snow-avatar-mini" style={{ background: '#10b981' }}>ER</div>
                              <div>
                                <strong>Elena Rostova</strong>
                                <div style={{ color: 'var(--snow-text-muted)' }}>Parental leave approved</div>
                              </div>
                            </div>
                            <span className="snow-badge-pill badge-green">Synced to DB</span>
                          </div>

                          <div className="snow-feed-item">
                            <div className="snow-feed-info">
                              <div className="snow-avatar-mini" style={{ background: '#a855f7' }}>AI</div>
                              <div>
                                <strong>AI HR Copilot</strong>
                                <div style={{ color: 'var(--snow-text-muted)' }}>Turnover risk scan completed</div>
                              </div>
                            </div>
                            <span className="snow-badge-pill badge-purple">0 Anomalies</span>
                          </div>
                        </div>
                      </div>

                      {/* Department Breakdown */}
                      <div className="snow-panel-card">
                        <div className="snow-panel-title">
                          <span>Department Staffing</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--snow-text-muted)' }}>All Nodes</span>
                        </div>
                        <div className="snow-dept-bars">
                          <div className="snow-dept-item">
                            <div className="snow-dept-meta">
                              <span>Engineering & R&D</span>
                              <span>542 (36%)</span>
                            </div>
                            <div className="snow-dept-track">
                              <div className="snow-dept-fill" style={{ width: '36%' }} />
                            </div>
                          </div>
                          <div className="snow-dept-item">
                            <div className="snow-dept-meta">
                              <span>Product & Design</span>
                              <span>218 (15%)</span>
                            </div>
                            <div className="snow-dept-track">
                              <div className="snow-dept-fill" style={{ width: '15%' }} />
                            </div>
                          </div>
                          <div className="snow-dept-item">
                            <div className="snow-dept-meta">
                              <span>Sales & Customer Success</span>
                              <span>486 (33%)</span>
                            </div>
                            <div className="snow-dept-track">
                              <div className="snow-dept-fill" style={{ width: '33%' }} />
                            </div>
                          </div>
                          <div className="snow-dept-item">
                            <div className="snow-dept-meta">
                              <span>Operations & People</span>
                              <span>236 (16%)</span>
                            </div>
                            <div className="snow-dept-track">
                              <div className="snow-dept-fill" style={{ width: '16%' }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. SMART ATTENDANCE TAB */}
                {activeMockupTab === 'attendance' && (
                  <div className="snow-mockup-stack">
                    <div className="snow-att-locations-grid">
                      <div className="snow-panel-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <MapPin size={18} color="var(--snow-accent)" />
                          <strong>San Francisco HQ</strong>
                        </div>
                        <div className="snow-kpi-val">486 / 492</div>
                        <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: 4 }}>98.8% On-site verified</div>
                      </div>
                      <div className="snow-panel-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <MapPin size={18} color="var(--snow-accent)" />
                          <strong>London Hub</strong>
                        </div>
                        <div className="snow-kpi-val">312 / 315</div>
                        <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: 4 }}>99.0% Shift compliance</div>
                      </div>
                      <div className="snow-panel-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <Zap size={18} color="var(--snow-accent)" />
                          <strong>Remote Worldwide</strong>
                        </div>
                        <div className="snow-kpi-val">663 Active</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--snow-accent)', marginTop: 4 }}>IP & Token Verified</div>
                      </div>
                    </div>

                    <div className="snow-panel-card">
                      <div className="snow-panel-title">
                        <span>Recent Geofenced Punches</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--snow-text-muted)' }}>Auto-synced with biometric devices</span>
                      </div>
                      <div className="snow-punches-list">
                        {[
                          { name: 'Sarah Miller', dept: 'Engineering', time: '09:02 AM', status: 'In-Office (SF HQ)', method: 'FaceID Verified' },
                          { name: 'Aiden Patel', dept: 'Marketing', time: '08:55 AM', status: 'In-Office (NYC)', method: 'Mobile Geofence' },
                          { name: 'Chloe Dubois', dept: 'Product', time: '09:00 AM', status: 'Remote (Paris, FR)', method: 'Workstation Check-in' }
                        ].map((row, idx) => (
                          <div key={idx} className="snow-punch-row">
                            <div className="snow-punch-user">
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
                              <strong>{row.name}</strong>
                              <span style={{ color: 'var(--snow-text-muted)' }}>({row.dept})</span>
                            </div>
                            <div className="snow-punch-tags">
                              <span>{row.time}</span>
                              <span className="snow-badge-pill badge-blue">{row.status}</span>
                              <span className="snow-badge-pill badge-green">{row.method}</span>
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
                      <span className="snow-badge-pill badge-blue">3 Pending Review</span>
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
                          <div key={leave.id} className="snow-leave-approval-card">
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                <strong style={{ fontSize: '1rem' }}>{leave.name}</strong>
                                <span style={{ fontSize: '0.8rem', color: 'var(--snow-text-muted)' }}>• {leave.role}</span>
                                <span className="snow-badge-pill badge-purple">{leave.type}</span>
                              </div>
                              <div style={{ fontSize: '0.88rem', marginTop: 4, color: 'var(--snow-text-secondary)' }}>
                                <strong>{leave.dates}</strong> — <em>"{leave.reason}"</em>
                              </div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--snow-text-muted)', marginTop: 2 }}>
                                Policy balance: {leave.balance}
                              </div>
                            </div>

                            <div className="snow-leave-approval-actions">
                              {isApproved ? (
                                <span className="snow-badge-pill badge-green" style={{ padding: '8px 16px', fontSize: '0.88rem' }}>
                                  ✓ Approved & Logged in Snowflake
                                </span>
                              ) : (
                                <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                                  <button
                                    type="button"
                                    className="snow-btn-secondary"
                                    style={{ padding: '8px 14px', fontSize: '0.84rem', flex: 1 }}
                                    onClick={() => toast('Request sent for additional info.')}
                                  >
                                    Details
                                  </button>
                                  <button
                                    type="button"
                                    className="snow-btn-primary"
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
                  <div className="snow-copilot-mockup-grid">
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
                          className="snow-ai-chip"
                          onClick={() => handleSelectAiPrompt(item.q, item.a)}
                        >
                          <span>{item.q}</span>
                          <ArrowRight size={14} style={{ flexShrink: 0 }} />
                        </button>
                      ))}
                    </div>

                    <div className="snow-panel-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--snow-border-subtle)', paddingBottom: 10 }}>
                        <Bot size={18} color="var(--snow-accent)" />
                        <strong>SnowFlex AI HR Assistant</strong>
                        <span className="snow-badge-pill badge-green" style={{ marginLeft: 'auto' }}>Online</span>
                      </div>

                      <div className="snow-chat-msg-user">
                        {copilotQuestion}
                      </div>

                      <div className="snow-chat-msg-ai">
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
                    <div className="snow-overview-kpis">
                      <div className="snow-kpi-card">
                        <div className="snow-kpi-head">Gross Payroll (Sep)</div>
                        <div className="snow-kpi-val">$1,842,500</div>
                        <span className="snow-kpi-delta is-positive">1,482 Employees</span>
                      </div>
                      <div className="snow-kpi-card">
                        <div className="snow-kpi-head">Direct Deposit Net</div>
                        <div className="snow-kpi-val">$1,398,320</div>
                        <span className="snow-kpi-delta is-positive">Ready for batch release</span>
                      </div>
                      <div className="snow-kpi-card">
                        <div className="snow-kpi-head">Statutory & Taxes</div>
                        <div className="snow-kpi-val">$328,140</div>
                        <span className="snow-kpi-delta is-neutral">Federal + State/Intl</span>
                      </div>
                      <div className="snow-kpi-card">
                        <div className="snow-kpi-head">Audit Verification</div>
                        <div className="snow-kpi-val">100%</div>
                        <span className="snow-kpi-delta is-positive">0 ledger discrepancies</span>
                      </div>
                    </div>

                    <div className="snow-panel-card" style={{ padding: 18 }}>
                      <div className="snow-panel-title">
                        <span>Automated Payroll Execution Checklist</span>
                        <span className="snow-badge-pill badge-green">Audit Ready</span>
                      </div>
                      <div className="snow-payroll-checklist-grid">
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
      <section className="snow-stats-section" id="stats">
        <div className="snow-container">
          <div className="snow-stats-grid">
            <div className="snow-stat-card">
              <div className="snow-stat-number">140,000+</div>
              <div className="snow-stat-label">Active Team Members</div>
              <div className="snow-stat-desc">Managed across 42 countries daily</div>
            </div>
            <div className="snow-stat-card">
              <div className="snow-stat-number">99.4%</div>
              <div className="snow-stat-label">Payroll & Time Precision</div>
              <div className="snow-stat-desc">Zero manual reconciliation headaches</div>
            </div>
            <div className="snow-stat-card">
              <div className="snow-stat-number">3.8x</div>
              <div className="snow-stat-label">Faster Approvals</div>
              <div className="snow-stat-desc">Multi-tier manager workflows resolved in hours</div>
            </div>
            <div className="snow-stat-card">
              <div className="snow-stat-number">85%</div>
              <div className="snow-stat-label">Fewer HR Tickets</div>
              <div className="snow-stat-desc">Handled automatically by AI HR Copilot</div>
            </div>
          </div>

          {/* Enterprise Logos Marquee */}
          <div className="snow-logos-wrap">
            <div className="snow-logos-title">Trusted by Modern Enterprise People Teams Worldwide</div>
            <div className="snow-logos-row">
              <div className="snow-client-logo"><Sparkles size={18} /> VORTEX CLOUD</div>
              <div className="snow-client-logo"><Server size={18} /> NORDIC DATA LABS</div>
              <div className="snow-client-logo"><Layers size={18} /> APEX GLOBAL</div>
              <div className="snow-client-logo"><Snowflake size={18} /> FROST TECH</div>
              <div className="snow-client-logo"><ShieldCheck size={18} /> AURA HEALTH</div>
              <div className="snow-client-logo"><Award size={18} /> SOLARIA FINANCIAL</div>
              <div className="snow-client-logo"><Zap size={18} /> CYBERPULSE</div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          4. FEATURES SECTION (Required 6 core features)
          ==================================================================== */}
      <section className="snow-features-section" id="features">
        <div className="snow-container">
          <div className="snow-section-header">
            <div className="snow-section-kicker">
              <Sparkles size={14} />
              Enterprise Architecture
            </div>
            <h2 className="snow-section-title">
              Engineered to Run Every Facet of People Operations
            </h2>
            <p className="snow-section-desc">
              Replace fragmented tools, fragile spreadsheets, and disconnected HRIS databases with
              a single, unified system connected directly to your enterprise data warehouse.
            </p>
          </div>

          <div className="snow-bento-grid">
            {/* 1. Employee Profiles */}
            <div className="snow-feature-card">
              <div className="snow-feature-icon-box">
                <Users size={26} />
              </div>
              <div className="snow-feature-pill">Core System</div>
              <h3 className="snow-feature-title">360° Employee Profiles</h3>
              <p className="snow-feature-body">
                Centralize identity, contracts, emergency contacts, organizational hierarchy,
                and role permissions in an encrypted, audit-trailed master directory.
              </p>
              <ul className="snow-feature-bullets">
                <li><Check size={15} /> Dynamic organizational charts & departmental trees</li>
                <li><Check size={15} /> Role-Based Access Control (RBAC) with audit logs</li>
                <li><Check size={15} /> Instant digital onboarding & offboarding workflows</li>
              </ul>
            </div>

            {/* 2. Attendance */}
            <div className="snow-feature-card">
              <div className="snow-feature-icon-box">
                <Clock size={26} />
              </div>
              <div className="snow-feature-pill">Telemetry</div>
              <h3 className="snow-feature-title">Smart Attendance & Shifts</h3>
              <p className="snow-feature-body">
                Precision time tracking across mobile, web, and biometric terminal integrations
                with geofenced punch verification and anomaly detection.
              </p>
              <ul className="snow-feature-bullets">
                <li><Check size={15} /> Geofencing verification for physical office hubs</li>
                <li><Check size={15} /> Real-time shift scheduling & break monitoring</li>
                <li><Check size={15} /> Automated overtime calculation & regulatory alerts</li>
              </ul>
            </div>

            {/* 3. Payroll */}
            <div className="snow-feature-card">
              <div className="snow-feature-icon-box">
                <DollarSign size={26} />
              </div>
              <div className="snow-feature-pill">Compensation</div>
              <h3 className="snow-feature-title">Automated Payroll Engine</h3>
              <p className="snow-feature-body">
                Eliminate payroll friction. Synchronize timecards, commissions, bonuses,
                and statutory tax deductions with a single automated approval cycle.
              </p>
              <ul className="snow-feature-bullets">
                <li><Check size={15} /> One-click direct deposit & multi-currency payout</li>
                <li><Check size={15} /> Automated tax withholdings & compliance filings</li>
                <li><Check size={15} /> Direct export to QuickBooks, NetSuite & SAP</li>
              </ul>
            </div>

            {/* 4. Leave Management */}
            <div className="snow-feature-card">
              <div className="snow-feature-icon-box">
                <Calendar size={26} />
              </div>
              <div className="snow-feature-pill">Workforce Flow</div>
              <h3 className="snow-feature-title">Multi-Tier Leave Management</h3>
              <p className="snow-feature-body">
                Custom policies for PTO, sick days, parental leave, and bereavement with
                automated balance accruals and customizable multi-level approval hierarchies.
              </p>
              <ul className="snow-feature-bullets">
                <li><Check size={15} /> Automated accrual rules & carryover caps</li>
                <li><Check size={15} /> Calendar clash detection & coverage warnings</li>
                <li><Check size={15} /> Real-time sync with Google Calendar & Outlook</li>
              </ul>
            </div>

            {/* 5. Performance */}
            <div className="snow-feature-card">
              <div className="snow-feature-icon-box">
                <Award size={26} />
              </div>
              <div className="snow-feature-pill">Talent Growth</div>
              <h3 className="snow-feature-title">Performance & OKR Alignment</h3>
              <p className="snow-feature-body">
                Empower your leaders with continuous feedback cycles, 360-degree peer reviews,
                goal tracking, and structured promotion calibration frameworks.
              </p>
              <ul className="snow-feature-bullets">
                <li><Check size={15} /> 1-on-1 meeting agendas and historical action logs</li>
                <li><Check size={15} /> 360-degree review cycles with confidential ratings</li>
                <li><Check size={15} /> Objective key results (OKRs) synced across teams</li>
              </ul>
            </div>

            {/* 6. Reports & Analytics */}
            <div className="snow-feature-card">
              <div className="snow-feature-icon-box">
                <BarChart3 size={26} />
              </div>
              <div className="snow-feature-pill">Snowflake Intelligence</div>
              <h3 className="snow-feature-title">Deep Reports & Snowflake Analytics</h3>
              <p className="snow-feature-body">
                Harness the compute power of Snowflake Data Warehouse. Run predictive retention
                models, department labor expenditure curves, and executive headcount reports.
              </p>
              <ul className="snow-feature-bullets">
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
      <section className="snow-how-section" id="how-it-works">
        <div className="snow-container">
          <div className="snow-section-header">
            <div className="snow-section-kicker">
              <Zap size={14} />
              Zero-Friction Adoption
            </div>
            <h2 className="snow-section-title">Get Running at Full Speed in Days, Not Months</h2>
            <p className="snow-section-desc">
              SnowFlex was built to deploy smoothly alongside your existing systems with zero downtime
              or disruption to your employees.
            </p>
          </div>

          <div className="snow-steps-grid">
            <div className="snow-step-card">
              <div className="snow-step-num">01</div>
              <h3 className="snow-step-title">Connect & Ingest Data</h3>
              <p className="snow-step-desc">
                Sync instantly with your existing Snowflake data cloud, import CSV rosters, or authenticate
                via Google Workspace / Okta SSO in under 5 minutes.
              </p>
            </div>

            <div className="snow-step-card">
              <div className="snow-step-num">02</div>
              <h3 className="snow-step-title">Set Custom Policies</h3>
              <p className="snow-step-desc">
                Configure your company's PTO accrual schedules, manager approval chains, office geofences,
                and regional holiday calendars with no coding required.
              </p>
            </div>

            <div className="snow-step-card">
              <div className="snow-step-num">03</div>
              <h3 className="snow-step-title">Empower Your People</h3>
              <p className="snow-step-desc">
                Employees self-service timecards, apply for leave, chat via department channels, and ask the
                built-in AI HR Copilot questions anytime from any device.
              </p>
            </div>

            <div className="snow-step-card">
              <div className="snow-step-num">04</div>
              <h3 className="snow-step-title">Scale with Intelligence</h3>
              <p className="snow-step-desc">
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
      <section className="snow-ai-showcase" id="ai-copilot">
        <div className="snow-container">
          <div className="snow-ai-box">
            <div className="snow-ai-content">
              <div className="snow-feature-pill">Built-in AI Assistant</div>
              <h3>An HR Copilot That Truly Understands Your Workforce</h3>
              <p>
                Ask questions in plain English. SnowFlex AI analyzes employee historical data,
                leave policies, and payroll metrics safely within your secure Snowflake perimeter.
              </p>
              <div className="snow-ai-chips">
                <button
                  type="button"
                  className="snow-ai-chip"
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
                  className="snow-ai-chip"
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
                  className="snow-ai-chip"
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

            <div className="snow-ai-terminal">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottom: '1px solid var(--snow-border-subtle)' }}>
                <Bot size={18} color="var(--snow-accent)" />
                <strong>SnowFlex Copilot Engine</strong>
                <span className="snow-badge-pill badge-green" style={{ marginLeft: 'auto' }}>Snowflake RAG Active</span>
              </div>
              <div className="snow-chat-msg-user">
                {copilotQuestion}
              </div>
              <div className="snow-chat-msg-ai">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontSize: '0.78rem', color: 'var(--snow-accent)' }}>
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
      <section className="snow-pricing-section" id="pricing">
        <div className="snow-container">
          <div className="snow-section-header">
            <div className="snow-section-kicker">
              <DollarSign size={14} />
              Transparent Pricing
            </div>
            <h2 className="snow-section-title">Predictable Plans That Scale With You</h2>
            <p className="snow-section-desc">
              All plans include complete core features, bank-grade encryption, and 14-day risk-free trials.
              No hidden migration or implementation fees.
            </p>
          </div>

          {/* Monthly / Annual Toggle */}
          <div className="snow-pricing-toggle-wrap">
            <div className="snow-billing-switch">
              <button
                type="button"
                className={`snow-billing-btn ${billingCycle === 'monthly' ? 'is-active' : ''}`}
                onClick={() => setBillingCycle('monthly')}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                className={`snow-billing-btn ${billingCycle === 'annual' ? 'is-active' : ''}`}
                onClick={() => setBillingCycle('annual')}
              >
                Annual Billing
              </button>
            </div>
            <span className="snow-discount-pill">Save 20% Annually</span>
          </div>

          {/* Pricing Cards Grid */}
          <div className="snow-pricing-grid">
            {/* Tier 1: Starter */}
            <div className="snow-price-card">
              <div className="snow-price-tier">Starter</div>
              <div className="snow-price-tagline">
                Essential employee management for agile teams and growing startups up to 50 members.
              </div>
              <div className="snow-price-num-row">
                <span className="snow-price-currency">$</span>
                <span className="snow-price-val">{billingCycle === 'annual' ? '5.60' : '7'}</span>
                <span className="snow-price-unit">/ employee / month</span>
              </div>
              <Link to="/register" className="snow-btn-secondary">
                Start 14-Day Free Trial
              </Link>
              <ul className="snow-price-features-list">
                <li><CheckCircle2 size={16} /> 360° Employee Profiles & Directory</li>
                <li><CheckCircle2 size={16} /> Web & Mobile Attendance Clock-In</li>
                <li><CheckCircle2 size={16} /> Standard Leave Requests & Balances</li>
                <li><CheckCircle2 size={16} /> Company Holiday Calendar Sync</li>
                <li><CheckCircle2 size={16} /> Real-Time Live Team Chat</li>
                <li><CheckCircle2 size={16} /> Standard Email Support (24h SLA)</li>
              </ul>
            </div>

            {/* Tier 2: Professional (Most Popular) */}
            <div className="snow-price-card is-popular">
              <div className="snow-popular-badge">Most Popular</div>
              <div className="snow-price-tier">Growth & Pro</div>
              <div className="snow-price-tagline">
                Complete HR automation, payroll, and AI assistance for scaling businesses up to 500 members.
              </div>
              <div className="snow-price-num-row">
                <span className="snow-price-currency">$</span>
                <span className="snow-price-val">{billingCycle === 'annual' ? '11.20' : '14'}</span>
                <span className="snow-price-unit">/ employee / month</span>
              </div>
              <Link to="/register" className="snow-btn-primary">
                Get Started with Pro
                <ArrowRight size={16} />
              </Link>
              <ul className="snow-price-features-list">
                <li><CheckCircle2 size={16} /> <strong>Everything in Starter</strong></li>
                <li><CheckCircle2 size={16} /> Automated Payroll Calculation & Tax Ledgers</li>
                <li><CheckCircle2 size={16} /> Multi-Tier Manager Approval Hierarchies</li>
                <li><CheckCircle2 size={16} /> Geofenced & Biometric Attendance Verification</li>
                <li><CheckCircle2 size={16} /> <strong>SnowFlex AI HR Copilot & Assistant</strong></li>
                <li><CheckCircle2 size={16} /> Performance OKRs & 360° Review Cycles</li>
                <li><CheckCircle2 size={16} /> Advanced Analytics & Custom CSV / PDF Exports</li>
                <li><CheckCircle2 size={16} /> Priority 24/7 Chat & Ticket Support</li>
              </ul>
            </div>

            {/* Tier 3: Enterprise */}
            <div className="snow-price-card">
              <div className="snow-price-tier">Enterprise</div>
              <div className="snow-price-tagline">
                Dedicated infrastructure, custom integrations, and SLA guarantees for global enterprises.
              </div>
              <div className="snow-price-num-row">
                <span className="snow-price-currency">$</span>
                <span className="snow-price-val">{billingCycle === 'annual' ? '20.80' : '26'}</span>
                <span className="snow-price-unit">/ employee / month</span>
              </div>
              <button
                type="button"
                className="snow-btn-secondary"
                onClick={() => setIsDemoModalOpen(true)}
              >
                Schedule Enterprise Demo
              </button>
              <ul className="snow-price-features-list">
                <li><CheckCircle2 size={16} /> <strong>Everything in Growth & Pro</strong></li>
                <li><CheckCircle2 size={16} /> <strong>Dedicated Snowflake Data Warehouse Cluster</strong></li>
                <li><CheckCircle2 size={16} /> Custom SAML / SSO / Okta & SCIM Provisioning</li>
                <li><CheckCircle2 size={16} /> Custom HRIS & ERP Integrations (Workday, SAP)</li>
                <li><CheckCircle2 size={16} /> 99.99% Financially-Backed SLA</li>
                <li><CheckCircle2 size={16} /> Dedicated Customer Success Manager</li>
                <li><CheckCircle2 size={16} /> Custom Security & GDPR / HIPAA Audit Reports</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          8. TESTIMONIALS SECTION
          ==================================================================== */}
      <section className="snow-testimonials-section" id="testimonials">
        <div className="snow-container">
          <div className="snow-section-header">
            <div className="snow-section-kicker">
              <Award size={14} />
              Customer Stories
            </div>
            <h2 className="snow-section-title">Loved by People Teams and Employees Alike</h2>
            <p className="snow-section-desc">
              Discover how leading high-growth companies rely on SnowFlex to simplify their workplace operations.
            </p>
          </div>

          <div className="snow-testimonials-grid">
            <div className="snow-testi-card">
              <div className="snow-stars-row">
                {'★★★★★'}
              </div>
              <p className="snow-testi-quote">
                "SnowFlex cut our monthly payroll processing time from four whole days down to 45 minutes.
                The live Snowflake synchronization gives our executive team total trust in our workforce numbers."
              </p>
              <div className="snow-testi-author">
                <div className="snow-avatar-mini" style={{ background: '#0284c7' }}>MC</div>
                <div>
                  <div className="snow-testi-name">Marcus Vance</div>
                  <div className="snow-testi-role">Chief People Officer, Vortex Cloud (1,400 employees)</div>
                </div>
              </div>
            </div>

            <div className="snow-testi-card">
              <div className="snow-stars-row">
                {'★★★★★'}
              </div>
              <p className="snow-testi-quote">
                "The AI Copilot has fundamentally changed how our managers approve leaves and check team schedules.
                Employees love that they don't have to wait days for simple HR policy answers."
              </p>
              <div className="snow-testi-author">
                <div className="snow-avatar-mini" style={{ background: '#06b6d4' }}>SL</div>
                <div>
                  <div className="snow-testi-name">Sonja Lindqvist</div>
                  <div className="snow-testi-role">Head of Global Talent, Nordic Data Labs</div>
                </div>
              </div>
            </div>

            <div className="snow-testi-card">
              <div className="snow-stars-row">
                {'★★★★★'}
              </div>
              <p className="snow-testi-quote">
                "Switching from our clunky legacy HRIS to SnowFlex felt like moving from dial-up to fiber optics.
                The interface is gorgeous, snappy, and our employees actually enjoy logging in."
              </p>
              <div className="snow-testi-author">
                <div className="snow-avatar-mini" style={{ background: '#a855f7' }}>TK</div>
                <div>
                  <div className="snow-testi-name">Tariq Khan</div>
                  <div className="snow-testi-role">VP Operations, Apex Global Technologies</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          9. FAQ SECTION
          ==================================================================== */}
      <section className="snow-faq-section" id="faq">
        <div className="snow-container">
          <div className="snow-section-header">
            <div className="snow-section-kicker">
              <MessageSquare size={14} />
              Got Questions?
            </div>
            <h2 className="snow-section-title">Frequently Asked Questions</h2>
            <p className="snow-section-desc">
              Everything you need to know about SnowFlex, implementation, and security.
            </p>
          </div>

          <div className="snow-faq-accordion">
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
                <div key={index} className={`snow-faq-item ${isOpen ? 'is-open' : ''}`}>
                  <button
                    type="button"
                    className="snow-faq-trigger"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    aria-expanded={isOpen}
                  >
                    <span>{faq.q}</span>
                    <ChevronDown size={20} />
                  </button>
                  {isOpen && (
                    <div className="snow-faq-answer">
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
      <section className="snow-final-cta-section">
        <div className="snow-container">
          <div className="snow-cta-card">
            <div className="snow-cta-card-content">
              <h2 className="snow-cta-title">
                Ready to Transform Your Workforce Operations?
              </h2>
              <p className="snow-cta-desc">
                Join over 2,000+ forward-thinking organizations scaling faster, reducing HR overhead,
                and delighting employees with SnowFlex.
              </p>
              <div className="snow-cta-actions">
                <Link to="/register" className="snow-btn-cta-white">
                  Get Started Free
                  <ArrowRight size={18} />
                </Link>
                <button
                  type="button"
                  className="snow-btn-cta-outline"
                  onClick={() => setIsDemoModalOpen(true)}
                >
                  Schedule Enterprise Demo
                </button>
              </div>
              <div className="snow-cta-footnotes">
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
      <footer className="snow-footer">
        <div className="snow-container">
          <div className="snow-footer-grid">
            <div className="snow-footer-brand">
              <Link to="/" className="snow-brand-link">
                <span className="snow-logo-mark">
                  <Snowflake size={20} strokeWidth={2.4} />
                </span>
                <span className="snow-brand-title">snowflex</span>
              </Link>
              <p className="snow-footer-tagline">
                The next-generation People Operations and Employee Management System powered
                by Snowflake Data Cloud.
              </p>
              <div className="snow-status-pill">
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                <span>Snowflake Cloud: 99.99% Live</span>
              </div>
            </div>

            <div className="snow-footer-col">
              <div className="snow-footer-heading">Product</div>
              <ul className="snow-footer-links">
                <li><a href="#features">Employee Profiles</a></li>
                <li><a href="#features">Smart Attendance</a></li>
                <li><a href="#features">Automated Payroll</a></li>
                <li><a href="#features">Leave Management</a></li>
                <li><a href="#features">Performance & OKRs</a></li>
                <li><a href="#features">Reports & Telemetry</a></li>
              </ul>
            </div>

            <div className="snow-footer-col">
              <div className="snow-footer-heading">Solutions</div>
              <ul className="snow-footer-links">
                <li><a href="#pricing">For Fast-Growing Startups</a></li>
                <li><a href="#pricing">For Global Enterprises</a></li>
                <li><a href="#features">For Hybrid & Remote Teams</a></li>
                <li><a href="#features">Data Warehouse Sync</a></li>
                <li><a href="#features">Compliance & Audits</a></li>
              </ul>
            </div>

            <div className="snow-footer-col">
              <div className="snow-footer-heading">Resources</div>
              <ul className="snow-footer-links">
                <li><a href="#faq">Help Center</a></li>
                <li><a href="#mockup">Product Tour</a></li>
                <li><a href="#faq">Security & SOC2</a></li>
                <li><a href="#faq">API Documentation</a></li>
                <li><a href="#pricing">Pricing Plans</a></li>
              </ul>
            </div>

            <div className="snow-footer-col">
              <div className="snow-footer-heading">Company</div>
              <ul className="snow-footer-links">
                <li><Link to="/login">Sign In</Link></li>
                <li><Link to="/register">Create Account</Link></li>
                <li><button type="button" onClick={() => setIsDemoModalOpen(true)} style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', font: 'inherit', cursor: 'pointer' }}>Contact Sales</button></li>
                <li><a href="#testimonials">Customer Stories</a></li>
                <li><a href="#faq">Privacy & Terms</a></li>
              </ul>
            </div>
          </div>

          <div className="snow-footer-bottom">
            <div>
              © 2026 SnowFlex People Operations Inc. All rights reserved.
            </div>
            <div className="snow-social-links">
              <a href="https://github.com" target="_blank" rel="noreferrer" className="snow-social-icon" aria-label="GitHub">
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noreferrer" className="snow-social-icon" aria-label="X Twitter">
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="snow-social-icon" aria-label="LinkedIn">
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
        <div className="snow-modal-backdrop" onClick={() => setIsDemoModalOpen(false)}>
          <div className="snow-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="snow-modal-header">
              <div>
                <h3 className="snow-modal-title">Schedule an Enterprise Walkthrough</h3>
                <p className="snow-modal-subtitle">
                  Connect with a SnowFlex solutions architect to explore dedicated Snowflake deployment.
                </p>
              </div>
              <button
                type="button"
                className="snow-modal-close"
                onClick={() => setIsDemoModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitDemo} className="snow-modal-form">
              <div className="snow-form-group">
                <label className="snow-form-label">Full Name</label>
                <input
                  type="text"
                  required
                  className="snow-form-input"
                  placeholder="e.g. Jane Doe"
                  value={demoForm.name}
                  onChange={(e) => setDemoForm({ ...demoForm, name: e.target.value })}
                />
              </div>

              <div className="snow-form-group">
                <label className="snow-form-label">Work Email</label>
                <input
                  type="email"
                  required
                  className="snow-form-input"
                  placeholder="jane@company.com"
                  value={demoForm.email}
                  onChange={(e) => setDemoForm({ ...demoForm, email: e.target.value })}
                />
              </div>

              <div className="snow-form-group">
                <label className="snow-form-label">Company Name</label>
                <input
                  type="text"
                  className="snow-form-input"
                  placeholder="e.g. Acme Corp"
                  value={demoForm.company}
                  onChange={(e) => setDemoForm({ ...demoForm, company: e.target.value })}
                />
              </div>

              <div className="snow-form-group">
                <label className="snow-form-label">Current Employee Headcount</label>
                <select
                  className="snow-form-select"
                  value={demoForm.size}
                  onChange={(e) => setDemoForm({ ...demoForm, size: e.target.value })}
                >
                  <option value="1-50">1 - 50 Employees</option>
                  <option value="50-250">50 - 250 Employees</option>
                  <option value="250-1000">250 - 1,000 Employees</option>
                  <option value="1000+">1,000+ Global Employees</option>
                </select>
              </div>

              <div className="snow-form-group">
                <label className="snow-form-label">Specific Requirements (Optional)</label>
                <textarea
                  className="snow-form-textarea"
                  rows={3}
                  placeholder="e.g. Migrating from BambooHR, need biometric attendance integration..."
                  value={demoForm.message}
                  onChange={(e) => setDemoForm({ ...demoForm, message: e.target.value })}
                />
              </div>

              <button
                type="submit"
                className="snow-btn-primary"
                disabled={submittingDemo}
                style={{ width: '100%', marginTop: '6px' }}
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
