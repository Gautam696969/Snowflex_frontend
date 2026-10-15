import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../lib/theme'

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  const nextTheme = theme === 'dark' ? 'light' : 'dark'
  const Icon = theme === 'dark' ? Sun : Moon

  return (
    <button
      className={`theme-toggle inline-flex min-h-[34px] items-center justify-center gap-[7px] px-[10px] py-0 border border-[#dfe5dc] rounded-[5px] text-[#44594c] bg-white text-[10px] font-semibold whitespace-nowrap cursor-pointer transition-[background-color,border-color,color] duration-150 ease-out hover:border-[#b8c99b] hover:bg-[#f3f7ed] hover:text-[#243a33] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#8aa357] focus-visible:outline-offset-2 dark:border-[#435148] dark:text-[#d4e0d6] dark:bg-[#222c26] dark:hover:border-[#687c5d] dark:hover:text-[#f0f5ef] dark:hover:bg-[#2d3a31] ${className}`.trim()}
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
    >
      <Icon size={17} aria-hidden="true" />
      <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
    </button>
  )
}