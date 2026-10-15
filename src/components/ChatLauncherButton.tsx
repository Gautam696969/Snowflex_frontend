import { Bot, Sparkles } from 'lucide-react'

interface ChatLauncherButtonProps {
  isOpen: boolean
  onClick: () => void
}

export default function ChatLauncherButton({ isOpen, onClick }: ChatLauncherButtonProps) {
  return (
    <button
      className={`chat-launcher group relative grid w-[64px] h-[64px] place-items-center border border-[#dcf498]/60 rounded-full text-[#d9ed74] bg-[radial-gradient(circle_at_32%_20%,#39705a_0,#174b38_42%,#0f3428_100%)] shadow-[0_12px_28px_rgba(15,61,46,0.34),inset_0_2px_2px_rgba(255,255,255,0.26),inset_0_-5px_9px_rgba(0,0,0,0.32)] cursor-pointer isolate pointer-events-auto transition-[box-shadow] duration-180 hover:shadow-[0_17px_34px_rgba(15,61,46,0.4),inset_0_2px_2px_rgba(255,255,255,0.3),inset_0_-5px_9px_rgba(0,0,0,0.3)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#9dbb56] focus-visible:ring-offset-4 before:content-[''] before:absolute before:inset-[5px] before:border before:border-[#e5f7b0]/40 before:rounded-full before:pointer-events-none after:content-[''] after:absolute after:top-[8px] after:left-[13px] after:w-[24px] after:h-[12px] after:rounded-full after:bg-white/23 after:blur-[3px] after:-rotate-[28deg] after:pointer-events-none${isOpen ? ' is-open' : ''}`}
      type="button"
      aria-label={isOpen ? 'Close AI assistant' : 'Ask AI'}
      aria-expanded={isOpen}
      aria-controls="snowflex-chat-window"
      title="Ask AI"
      onClick={onClick}
    >
      <span className="chat-launcher-halo absolute -z-10 -inset-[6px] border border-[#c6f432]/70 rounded-full animate-[chat-launcher-pulse_2.8s_ease-out_infinite]" aria-hidden="true" />
      <span className={`chat-launcher-face relative z-10 grid w-[44px] h-[44px] place-items-center border border-[#e2f5ad]/45 rounded-full text-[#e8f7ae] bg-[linear-gradient(145deg,rgba(255,255,255,0.19),rgba(255,255,255,0.015)_58%),#1d5840] shadow-[0_3px_7px_rgba(0,0,0,0.24),inset_0_1px_rgba(255,255,255,0.23)] ${isOpen ? '' : 'animate-[chat-launcher-face-float_4s_ease-in-out_infinite]'} group-hover:[animation-play-state:paused] group-focus-visible:[animation-play-state:paused] group-[.is-open]:[animation-play-state:paused] group-hover:-translate-y-[2px] transition-transform duration-180`} aria-hidden="true">
        {isOpen ? <Sparkles size={25} strokeWidth={1.5} /> : <Bot size={25} strokeWidth={1.5} />}
      </span>
      <span className="chat-launcher-tooltip absolute right-[calc(100%+12px)] top-1/2 -translate-y-1/2 translate-x-[4px] p-[7px_10px] border border-[#dfe5dc] dark:border-[#435148] rounded-[4px] text-[#243a33] dark:text-[#e8efe9] bg-white dark:bg-[#222c26] shadow-[0_5px_16px_rgba(20,40,28,0.13)] text-[11px] font-semibold opacity-0 pointer-events-none group-hover:opacity-100 group-focus-visible:opacity-100 group-hover:translate-x-0 group-focus-visible:translate-x-0 transition-all duration-140 whitespace-nowrap" role="tooltip">Ask AI</span>
    </button>
  )
}
