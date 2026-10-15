import { useEffect, useRef, useCallback } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Home, LayoutDashboard, LogIn, Sparkles, UserPlus } from 'lucide-react'
import ThemeToggle from '../components/ThemeToggle'
import { readToken } from '../lib/auth-api'

export default function NotFound() {
  const location = useLocation()
  const navigate = useNavigate()
  const isAuthenticated = Boolean(readToken())

  const thirdDigitRef = useRef<HTMLSpanElement>(null)
  const secondDigitRef = useRef<HTMLSpanElement>(null)
  const firstDigitRef = useRef<HTMLSpanElement>(null)

  const activeCleanupRef = useRef<(() => void) | null>(null)

  const runAnimation = useCallback(() => {
    // If there is an active running loop, clean it up before starting a new one
    if (activeCleanupRef.current) {
      activeCleanupRef.current()
      activeCleanupRef.current = null
    }

    function randomNum() {
      return Math.floor(Math.random() * 9) + 1
    }

    let i = 0
    const time = 30
    const selector3 = thirdDigitRef.current
    const selector2 = secondDigitRef.current
    const selector1 = firstDigitRef.current

    if (!selector3 || !selector2 || !selector1) return

    const loop3 = window.setInterval(() => {
      if (i > 40) {
        window.clearInterval(loop3)
        selector3.textContent = '4'
      } else {
        selector3.textContent = String(randomNum())
        i++
      }
    }, time)

    const loop2 = window.setInterval(() => {
      if (i > 80) {
        window.clearInterval(loop2)
        selector2.textContent = '0'
      } else {
        selector2.textContent = String(randomNum())
        i++
      }
    }, time)

    const loop1 = window.setInterval(() => {
      if (i > 100) {
        window.clearInterval(loop1)
        selector1.textContent = '4'
      } else {
        selector1.textContent = String(randomNum())
        i++
      }
    }, time)

    const cleanup = () => {
      window.clearInterval(loop3)
      window.clearInterval(loop2)
      window.clearInterval(loop1)
    }

    activeCleanupRef.current = cleanup
    return cleanup
  }, [])

  useEffect(() => {
    const cleanup = runAnimation()
    return () => {
      if (cleanup) cleanup()
    }
  }, [runAnimation])

  function handleGoBack() {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate(isAuthenticated ? '/dashboard' : '/login')
    }
  }

  return (
    <main className="not-found-shell flex min-h-screen flex-col justify-between p-[clamp(16px,3vw,32px)] bg-[#f7f8f4] [background-image:radial-gradient(ellipse_at_15%_15%,rgba(242,185,168,0.35),transparent_45%),radial-gradient(ellipse_at_85%_85%,rgba(184,201,155,0.25),transparent_45%)] text-[var(--ink,#20251f)] box-border dark:bg-[#141b17] dark:[background-image:none]">
      <header className="not-found-topbar flex items-center justify-between w-full max-w-[1100px] mx-auto my-0">
        <Link to={isAuthenticated ? '/dashboard' : '/login'} className="brand-lockup inline-flex items-center gap-[10px] text-[var(--ink,#20251f)] font-['Manrope',sans-serif] text-[18px] font-extrabold no-underline dark:text-[#edf2ec]" aria-label="Home">
          <span className="brand-mark grid w-[34px] h-[34px] place-items-center border border-[rgba(32,37,31,0.16)] rounded-[6px] bg-[rgba(255,255,255,0.37)] dark:border-[#303b34] dark:bg-[rgba(255,255,255,0.06)]">
            <Sparkles size={19} aria-hidden="true" />
          </span>
          <span>northstar</span>
        </Link>
        <ThemeToggle />
      </header>

      <section className="not-found-container flex items-center justify-center flex-1 p-[30px_16px] w-full" aria-labelledby="not-found-title">
        {/* Error Page */}
        <div className="error w-full max-w-[760px] mx-auto my-0 font-['PT_Sans_Caption','DM_Sans',sans-serif]">
          <div className="container-floud w-full">
            <div className="col-xs-12 ground-color text-center relative w-full p-[clamp(28px,5vw,44px)_clamp(20px,4vw,36px)] border border-[rgba(46,55,40,0.1)] rounded-[16px] bg-white shadow-[0_20px_45px_rgba(32,37,31,0.06)] backdrop-blur-[12px] overflow-hidden dark:border-[#2a372f] dark:bg-[rgba(28,37,32,0.92)] dark:shadow-[0_24px_50px_rgba(0,0,0,0.35)]">
              <div
                className="container-error-404"
                onClick={runAnimation}
                title="Click to re-roll digits"
                style={{ cursor: 'pointer' }}
              >
                <div className="clip">
                  <div className="shadow">
                    <span ref={thirdDigitRef} className="digit thirdDigit">4</span>
                  </div>
                </div>
                <div className="clip">
                  <div className="shadow">
                    <span ref={secondDigitRef} className="digit secondDigit">0</span>
                  </div>
                </div>
                <div className="clip">
                  <div className="shadow">
                    <span ref={firstDigitRef} className="digit firstDigit">4</span>
                  </div>
                </div>
                <div className="msg">
                  OH!<span className="triangle" />
                </div>
              </div>
              <h2 id="not-found-title" className="h1 text-[clamp(24px,3.5vw,36px)] font-bold text-[var(--ink,#20251f)] mt-[16px] mb-[12px] dark:text-[#edf2ec]">Sorry! Page not found</h2>

              <p className="not-found-message max-w-[520px] mx-auto my-0 text-[#687368] text-[15px] leading-[1.6] dark:text-[#9eab9f]">
                We couldn't find the page at{' '}
                <code className="not-found-path px-[6px] py-[2px] rounded-[4px] bg-[#f1f4ed] text-[#bc503b] font-mono text-[13px] dark:bg-[#232e27] dark:text-[#f87171]">{location.pathname}</code>.
                It may have been moved, deleted, or the address might be mistyped.
              </p>

              <div className="not-found-actions flex items-center justify-center gap-[12px] mt-[28px] max-[540px]:flex-col max-[540px]:w-full">
                <button
                  type="button"
                  onClick={handleGoBack}
                  className="not-found-secondary-btn inline-flex min-h-[44px] items-center justify-center gap-[8px] px-[18px] py-0 border border-[#dfe5dc] rounded-[8px] bg-white text-[#333a32] text-[13px] font-semibold cursor-pointer transition-colors duration-150 hover:bg-[#f3f6ee] hover:border-[#b8c99b] dark:border-[#303b34] dark:bg-[#1c2520] dark:text-[#edf2ec] dark:hover:bg-[#27362e] max-[540px]:w-full"
                >
                  <ArrowLeft size={16} aria-hidden="true" />
                  <span>Go back</span>
                </button>

                {isAuthenticated ? (
                  <Link to="/dashboard" className="not-found-primary-btn inline-flex min-h-[44px] items-center justify-center gap-[8px] px-[20px] py-0 border border-[var(--accent,#ed6b4f)] rounded-[8px] bg-[var(--accent,#ed6b4f)] text-white text-[13px] font-bold no-underline cursor-pointer transition-all duration-150 hover:bg-[var(--accent-dark,#d9543a)] hover:border-[var(--accent-dark,#d9543a)] hover:shadow-[0_4px_14px_rgba(217,84,58,0.25)] max-[540px]:w-full">
                    <LayoutDashboard size={16} aria-hidden="true" />
                    <span>Go to Dashboard</span>
                  </Link>
                ) : (
                  <Link to="/login" className="not-found-primary-btn inline-flex min-h-[44px] items-center justify-center gap-[8px] px-[20px] py-0 border border-[var(--accent,#ed6b4f)] rounded-[8px] bg-[var(--accent,#ed6b4f)] text-white text-[13px] font-bold no-underline cursor-pointer transition-all duration-150 hover:bg-[var(--accent-dark,#d9543a)] hover:border-[var(--accent-dark,#d9543a)] hover:shadow-[0_4px_14px_rgba(217,84,58,0.25)] max-[540px]:w-full">
                    <LogIn size={16} aria-hidden="true" />
                    <span>Sign in</span>
                  </Link>
                )}
              </div>

              <div className="not-found-divider h-[1px] w-full max-w-[420px] mx-auto my-[28px] bg-[#e9ece6] dark:bg-[#2b3730]" />

              <div className="not-found-helpful flex items-center justify-center gap-[10px] flex-wrap text-[13px]">
                <span className="not-found-helpful-label text-[#889386] font-medium dark:text-[#7f8e83]">Quick destinations:</span>
                <div className="not-found-helpful-links flex items-center gap-[8px] flex-wrap">
                  <Link to="/dashboard" className="not-found-pill-link inline-flex items-center gap-[5px] px-[10px] py-[5px] rounded-full border border-[#dfe5dc] bg-[#f7f9f4] text-[#44553a] text-[12px] font-semibold no-underline transition-colors hover:border-[#b8c99b] hover:bg-white dark:border-[#303b34] dark:bg-[#1c2520] dark:text-[#c9d6cc] dark:hover:bg-[#27362e]">
                    <Home size={13} aria-hidden="true" />
                    <span>Dashboard</span>
                  </Link>
                  <Link to="/login" className="not-found-pill-link inline-flex items-center gap-[5px] px-[10px] py-[5px] rounded-full border border-[#dfe5dc] bg-[#f7f9f4] text-[#44553a] text-[12px] font-semibold no-underline transition-colors hover:border-[#b8c99b] hover:bg-white dark:border-[#303b34] dark:bg-[#1c2520] dark:text-[#c9d6cc] dark:hover:bg-[#27362e]">
                    <LogIn size={13} aria-hidden="true" />
                    <span>Login</span>
                  </Link>
                  <Link to="/register" className="not-found-pill-link inline-flex items-center gap-[5px] px-[10px] py-[5px] rounded-full border border-[#dfe5dc] bg-[#f7f9f4] text-[#44553a] text-[12px] font-semibold no-underline transition-colors hover:border-[#b8c99b] hover:bg-white dark:border-[#303b34] dark:bg-[#1c2520] dark:text-[#c9d6cc] dark:hover:bg-[#27362e]">
                    <UserPlus size={13} aria-hidden="true" />
                    <span>Register</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Error Page */}
      </section>

      <footer className="not-found-footer flex items-center justify-center p-[16px] text-[#889386] text-[12px] dark:text-[#7f8e83]">
        <span className="brand-footnote flex items-center gap-[6px]">
          <Sparkles size={13} aria-hidden="true" />
          Snowflex People Operations & Workspace
        </span>
      </footer>
    </main>
  )
}
