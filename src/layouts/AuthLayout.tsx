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
    <main className="auth-shell grid min-h-screen p-[22px] grid-cols-[minmax(360px,0.95fr)_minmax(460px,1.05fr)] gap-[22px] max-[900px]:p-[14px] max-[900px]:grid-cols-[minmax(285px,0.8fr)_minmax(390px,1.2fr)] max-[900px]:gap-[14px] max-[760px]:flex max-[760px]:flex-col max-[760px]:p-0 max-[760px]:gap-0 max-[760px]:bg-white">
      <aside className="brand-panel relative flex min-h-[calc(100vh-44px)] overflow-hidden flex-col justify-between p-[clamp(30px,5vw,68px)] rounded-[10px] bg-[#f2b9a8] [background-image:radial-gradient(ellipse_at_12%_88%,rgba(255,255,255,0.42),transparent_35%),radial-gradient(ellipse_at_84%_12%,rgba(255,255,255,0.46),transparent_25%)] isolate animate-[panel-in_500ms_ease-out_both] before:content-[''] before:absolute before:-z-1 before:top-[12%] before:-right-[27%] before:w-[74%] before:aspect-square before:rounded-full before:border before:border-[rgba(46,55,40,0.12)] after:content-[''] after:absolute after:-z-1 after:-right-[14%] after:-bottom-[24%] after:w-[56%] after:aspect-square after:rounded-full after:border after:border-[rgba(46,55,40,0.12)] max-[900px]:min-h-[calc(100vh-28px)] max-[900px]:p-[30px] max-[760px]:min-h-auto max-[760px]:px-[24px] max-[760px]:pt-[22px] max-[760px]:pb-[20px] max-[760px]:rounded-none max-[380px]:px-[18px]" aria-label="Northstar product introduction">
        <a className="brand-lockup inline-flex items-center gap-[10px] text-[var(--ink,#20251f)] font-['Manrope',sans-serif] text-[18px] font-extrabold no-underline" href="/login" aria-label="Northstar home">
          <span className="brand-mark grid w-[34px] h-[34px] place-items-center border border-[rgba(32,37,31,0.16)] rounded-[6px] bg-[rgba(255,255,255,0.37)]"><Sparkles size={19} aria-hidden="true" /></span>
          <span>northstar</span>
        </a>

        <div className="brand-copy max-w-[440px] mt-auto pt-[70px] pb-[34px] px-0 max-[760px]:max-w-[540px] max-[760px]:pt-[38px] max-[760px]:pb-0">
          <h1 className="m-0 font-['Manrope',sans-serif] text-[clamp(38px,4.4vw,64px)] font-semibold leading-[1.04] tracking-normal max-[900px]:text-[42px] max-[760px]:max-w-[440px] max-[760px]:text-[36px]">Make room for your best work.</h1>
          <p className="max-w-[355px] mt-[20px] mb-0 text-[#4f5549] text-[16px] leading-[1.65] max-[760px]:mt-[10px] max-[760px]:text-[14px]">A calmer space to bring your projects, people, and plans together.</p>
          <div className="artwork relative w-[min(100%,430px)] h-[226px] mt-[42px] mx-auto mb-0 max-[900px]:h-[190px] max-[900px]:mt-[28px] max-[760px]:hidden" aria-hidden="true">
            <div className="artwork-window absolute top-[8px] left-[12%] w-[76%] h-[193px] overflow-hidden border border-[rgba(32,37,31,0.13)] rounded-[9px] bg-[rgba(255,255,255,0.8)] shadow-[0_22px_45px_rgba(83,63,48,0.13)] -rotate-3 max-[900px]:h-[160px]">
              <div className="artwork-bar flex h-[34px] items-center gap-[4px] px-[12px] py-0 border-b border-[#e9ece6] bg-[#fbfcfa]">
                <span className="artwork-dot w-[6px] h-[6px] rounded-full bg-[#e8b2a2]" />
                <span className="artwork-dot w-[6px] h-[6px] rounded-full bg-[#d4dda2]" />
                <span className="artwork-dot w-[6px] h-[6px] rounded-full bg-[#b6d6c5]" />
              </div>
              <div className="artwork-content grid h-[calc(100%-34px)] p-[17px_18px] grid-cols-[1.2fr_0.8fr] gap-[10px]">
                <div className="artwork-chart relative overflow-hidden p-[12px] border border-[#e9ece6] rounded-[5px] bg-white">
                  <span className="block w-[42%] h-[6px] rounded-[2px] bg-[#e4e9df]" />
                  <strong className="block mt-[7px] font-['Manrope',sans-serif] text-[19px]">82.4%</strong>
                  <div className="chart-lines absolute right-[8%] bottom-[14px] left-[8%] h-[39px] border-b-2 border-[#de745c] [clip-path:polygon(0_73%,20%_50%,38%_63%,56%_25%,74%_42%,100%_0,100%_100%,0_100%)] bg-gradient-to-b from-[rgba(237,107,79,0.19)] to-transparent" />
                </div>
                <div className="artwork-stat flex p-[13px_10px] flex-col justify-between border border-[#e9ece6] rounded-[5px] bg-[#f8faf5]">
                  <span className="block w-[66%] h-[6px] rounded-[2px] bg-[#e4e9df]" />
                  <strong className="font-['Manrope',sans-serif] text-[15px]">On track</strong>
                  <span className="block w-[66%] h-[6px] rounded-[2px] bg-[#e4e9df]" />
                </div>
              </div>
            </div>
            <div className="artwork-orbit absolute top-0 right-[3%] grid w-[44px] h-[44px] place-items-center border border-[rgba(32,37,31,0.11)] rounded-full bg-[#d5e6b6] text-[#44553a] rotate-[7deg]"><ArrowUpRight size={20} /></div>
            <div className="artwork-tag absolute bottom-0 left-[1%] flex items-center gap-[7px] p-[9px_12px] border border-[rgba(32,37,31,0.1)] rounded-[5px] bg-white shadow-[0_9px_24px_rgba(83,63,48,0.12)] text-[#485345] text-[11px] font-semibold rotate-3 [&>svg]:text-[#5e7d51]"><Check size={14} /> A little more clarity</div>
          </div>
        </div>

        <div className="brand-footnote flex items-center gap-[8px] text-[#53594d] text-[12px] [&>svg]:text-[#68794a] max-[760px]:hidden"><Sparkles size={14} /> Thoughtful work starts here</div>
      </aside>

      <section className="auth-main relative flex min-w-0 items-center justify-center p-[clamp(24px,6vw,80px)] border border-[rgba(34,48,32,0.04)] rounded-[10px] bg-white shadow-[0_16px_55px_rgba(42,52,39,0.055)] animate-[form-in_560ms_80ms_ease-out_both] max-[900px]:p-[34px] max-[760px]:flex-1 max-[760px]:items-start max-[760px]:p-[36px_24px_32px] max-[760px]:border-0 max-[760px]:rounded-none max-[760px]:shadow-none max-[380px]:px-[18px]" aria-labelledby="auth-title">
        <ThemeToggle className="auth-theme-toggle absolute top-[20px] right-[20px]" />
        <div className="auth-content w-[min(100%,410px)] max-[760px]:mx-auto">
          <header className="auth-heading">
            <h2 id="auth-title" className="m-0 font-['Manrope',sans-serif] text-[32px] font-bold leading-[1.2] tracking-normal max-[760px]:text-[28px]">{title}</h2>
            <p className="mt-[10px] mb-0 text-[var(--muted,#778077)] text-[15px] leading-[1.6]">{description}</p>
          </header>
          {children}
        </div>
      </section>
    </main>
  )
}