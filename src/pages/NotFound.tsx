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
    <main className="not-found-shell">
      <header className="not-found-topbar">
        <Link to={isAuthenticated ? '/dashboard' : '/login'} className="brand-lockup" aria-label="Home">
          <span className="brand-mark">
            <Sparkles size={19} aria-hidden="true" />
          </span>
          <span>northstar</span>
        </Link>
        <ThemeToggle />
      </header>

      <section className="not-found-container" aria-labelledby="not-found-title">
        {/* Error Page */}
        <div className="error">
          <div className="container-floud">
            <div className="col-xs-12 ground-color text-center">
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
              <h2 id="not-found-title" className="h1">Sorry! Page not found</h2>

              <p className="not-found-message">
                We couldn't find the page at{' '}
                <code className="not-found-path">{location.pathname}</code>.
                It may have been moved, deleted, or the address might be mistyped.
              </p>

              <div className="not-found-actions">
                <button
                  type="button"
                  onClick={handleGoBack}
                  className="not-found-secondary-btn"
                >
                  <ArrowLeft size={16} aria-hidden="true" />
                  <span>Go back</span>
                </button>

                {isAuthenticated ? (
                  <Link to="/dashboard" className="not-found-primary-btn">
                    <LayoutDashboard size={16} aria-hidden="true" />
                    <span>Go to Dashboard</span>
                  </Link>
                ) : (
                  <Link to="/login" className="not-found-primary-btn">
                    <LogIn size={16} aria-hidden="true" />
                    <span>Sign in</span>
                  </Link>
                )}
              </div>

              <div className="not-found-divider" />

              <div className="not-found-helpful">
                <span className="not-found-helpful-label">Quick destinations:</span>
                <div className="not-found-helpful-links">
                  <Link to="/dashboard" className="not-found-pill-link">
                    <Home size={13} aria-hidden="true" />
                    <span>Dashboard</span>
                  </Link>
                  <Link to="/login" className="not-found-pill-link">
                    <LogIn size={13} aria-hidden="true" />
                    <span>Login</span>
                  </Link>
                  <Link to="/register" className="not-found-pill-link">
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

      <footer className="not-found-footer">
        <span className="brand-footnote">
          <Sparkles size={13} aria-hidden="true" />
          Snowflex People Operations & Workspace
        </span>
      </footer>
    </main>
  )
}
