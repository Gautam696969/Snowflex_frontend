import { useState, type ChangeEvent, type FocusEvent } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import FormError from './FormError'

type PasswordInputProps = {
  id: string
  label: string
  value: string
  placeholder?: string
  autoComplete?: string
  error?: string
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void
}

export default function PasswordInput({
  id,
  label,
  value,
  placeholder = 'Enter your password',
  autoComplete,
  error,
  onChange,
  onBlur,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false)
  const errorId = `${id}-error`

  return (
    <div className="field flex min-w-0 flex-col gap-[8px]">
      <label className="field-label text-[#333a32] text-[13px] font-semibold" htmlFor={id}>{label}</label>
      <div className="password-wrap relative">
        <input
          className="field-control w-full h-[49px] pl-[14px] pr-[48px] py-0 border border-[#dfe4dc] rounded-[5px] outline-none bg-white text-[var(--ink,#20251f)] text-[14px] placeholder:text-[#a1a9a0] hover:border-[#b9c3b7] focus-visible:border-[var(--accent,#ed6b4f)] focus-visible:shadow-[0_0_0_3px_rgba(237,107,79,0.14)] aria-[invalid=true]:border-[#cf5546] transition-[border-color,box-shadow] duration-160 ease-out"
          id={id}
          name={id}
          type={visible ? 'text' : 'password'}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          onChange={onChange}
          onBlur={onBlur}
        />
        <button
          className="visibility-button absolute top-1/2 right-[9px] -translate-y-1/2 grid w-[34px] h-[34px] place-items-center border-0 rounded-[4px] bg-transparent text-[#788176] cursor-pointer hover:bg-[#f3f5f1] hover:text-[var(--ink,#20251f)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-[rgba(237,107,79,0.35)] focus-visible:outline-offset-2"
          type="button"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
        </button>
      </div>
      <FormError id={errorId}>{error}</FormError>
    </div>
  )
}