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
    <div className="field">
      <label className="field-label" htmlFor={id}>{label}</label>
      <input
        className="field-control"
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