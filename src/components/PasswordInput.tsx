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
    <div className="field">
      <label className="field-label" htmlFor={id}>{label}</label>
      <div className="password-wrap">
        <input
          className="field-control"
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
          className="visibility-button"
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