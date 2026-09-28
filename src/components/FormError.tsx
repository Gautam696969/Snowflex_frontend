type FormErrorProps = {
  id: string
  children?: string
}

export default function FormError({ id, children }: FormErrorProps) {
  if (!children) return null

  return (
    <p className="form-error" id={id} role="alert">
      {children}
    </p>
  )
}