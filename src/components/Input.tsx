import type { ChangeEvent, FocusEvent } from 'react'
import FormError from './FormError'

type InputProps = {
  id: string
  label: string
  type?: 'text' | 'email'
  value: string
  placeholder?: string
  autoComplete?: string
  error?: string
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void
}

export default function Input({
  id,
  label,
  type = 'text',
  value,
  placeholder,
  autoComplete,
  error,
  onChange,
  onBlur,
}: InputProps) {
  const errorId = `${id}-error`

  return (
    <div className="field flex min-w-0 flex-col gap-[8px]">
      <label className="field-label text-[#333a32] text-[13px] font-semibold" htmlFor={id}>{label}</label>
      <input
        className="field-control w-full h-[49px] px-[14px] py-0 border border-[#dfe4dc] rounded-[5px] outline-none bg-white text-[var(--ink,#20251f)] text-[14px] placeholder:text-[#a1a9a0] hover:border-[#b9c3b7] focus-visible:border-[var(--accent,#ed6b4f)] focus-visible:shadow-[0_0_0_3px_rgba(237,107,79,0.14)] aria-[invalid=true]:border-[#cf5546] transition-[border-color,box-shadow] duration-160 ease-out"
        id={id}
        name={id}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onChange={onChange}
        onBlur={onBlur}
      />
      <FormError id={errorId}>{error}</FormError>
    </div>
  )
}