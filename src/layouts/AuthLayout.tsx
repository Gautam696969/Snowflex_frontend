import { ArrowUpRight, Check, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import ThemeToggle from '../components/ThemeToggle'

type AuthLayoutProps = {
  title: string
  description: string
  children: ReactNode
}

export default function AuthLayout({ title, description, children }: AuthLayoutProps) {
  return (
    <main className="auth-shell">
      <aside className="brand-panel" aria-label="Northstar product introduction">
        <a className="brand-lockup" href="/login" aria-label="Northstar home">
          <span className="brand-mark"><Sparkles size={19} aria-hidden="true" /></span>
          <span>northstar</span>
        </a>

        <div className="brand-copy">
          <h1>Make room for your best work.</h1>
          <p>A calmer space to bring your projects, people, and plans together.</p>
          <div className="artwork" aria-hidden="true">
            <div className="artwork-window">
              <div className="artwork-bar">
                <span className="artwork-dot" />
                <span className="artwork-dot" />
                <span className="artwork-dot" />
              </div>
              <div className="artwork-content">
                <div className="artwork-chart">
                  <span />
                  <strong>82.4%</strong>
                  <div className="chart-lines" />
                </div>
                <div className="artwork-stat">
                  <span />
                  <strong>On track</strong>
                  <span />
                </div>
              </div>
            </div>
            <div className="artwork-orbit"><ArrowUpRight size={20} /></div>
            <div className="artwork-tag"><Check size={14} /> A little more clarity</div>
          </div>
        </div>

        <div className="brand-footnote"><Sparkles size={14} /> Thoughtful work starts here</div>
      </aside>

      <section className="auth-main" aria-labelledby="auth-title">
        <ThemeToggle className="auth-theme-toggle" />
        <div className="auth-content">
          <header className="auth-heading">
            <h2 id="auth-title">{title}</h2>
            <p>{description}</p>
          </header>
          {children}
        </div>
      </section>
    </main>
  )
}