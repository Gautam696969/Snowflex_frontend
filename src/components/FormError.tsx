type FormErrorProps = {
  id: string
  children?: string
}

export default function FormError({ id, children }: FormErrorProps) {
  if (!children) return null

  return (
    <p className="form-error -mt-[2px] mb-0 text-[#b83d32] text-[12px] leading-[1.4]" id={id} role="alert">
      {children}
    </p>
  )
}