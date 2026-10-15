import Button from './Button'

type LoadingButtonProps = {
  loading: boolean
  disabled?: boolean
  children: string
}

export default function LoadingButton({ loading, disabled, children }: LoadingButtonProps) {
  return (
    <Button type="submit" disabled={disabled || loading} aria-busy={loading}>
      {loading && <span className="spinner w-[16px] h-[16px] border-2 border-[rgba(255,255,255,0.45)] border-t-white rounded-full animate-spin" aria-hidden="true" />}
      {loading ? 'Please wait...' : children}
    </Button>
  )
}