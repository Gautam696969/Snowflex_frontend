import Button from './Button'

type LoadingButtonProps = {
  loading: boolean
  disabled?: boolean
  children: string
}

export default function LoadingButton({ loading, disabled, children }: LoadingButtonProps) {
  return (
    <Button type="submit" disabled={disabled || loading} aria-busy={loading}>
      {loading && <span className="spinner" aria-hidden="true" />}
      {loading ? 'Please wait...' : children}
    </Button>
  )
}