import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
}

export default function Button({ children, className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`primary-button inline-flex w-full min-h-[49px] items-center justify-center gap-[9px] border border-[var(--accent,#ed6b4f)] rounded-[5px] bg-[var(--accent,#ed6b4f)] text-white text-[14px] font-bold cursor-pointer transition-[transform,background-color,border-color,box-shadow] duration-150 ease-out hover:not-disabled:-translate-y-[1px] hover:not-disabled:border-[var(--accent-dark,#d9543a)] hover:not-disabled:bg-[var(--accent-dark,#d9543a)] hover:not-disabled:shadow-[0_7px_16px_rgba(217,84,58,0.2)] active:not-disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-[0.54] focus-visible:outline focus-visible:outline-3 focus-visible:outline-[rgba(237,107,79,0.35)] focus-visible:outline-offset-2 ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  )
}