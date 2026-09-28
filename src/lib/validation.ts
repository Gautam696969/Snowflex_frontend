export const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

export function getLoginErrors(email: string, password: string) {
  return {
    email: !email.trim()
      ? 'Email is required.'
      : !isValidEmail(email)
        ? 'Enter a valid email address.'
        : '',
    password: password ? '' : 'Password is required.',
  }
}

export function getRegistrationErrors(
  fullName: string,
  email: string,
  password: string,
  confirmation: string,
  acceptedTerms: boolean,
) {
  return {
    fullName: fullName.trim() ? '' : 'Full name is required.',
    email: !email.trim()
      ? 'Email is required.'
      : !isValidEmail(email)
        ? 'Enter a valid email address.'
        : '',
    password: !password
      ? 'Password is required.'
      : password.length < 8
        ? 'Use at least 8 characters.'
        : '',
    confirmation: !confirmation
      ? 'Please confirm your password.'
      : confirmation !== password
        ? 'Passwords do not match.'
        : '',
    acceptedTerms: acceptedTerms ? '' : 'Please accept the terms to continue.',
  }
}