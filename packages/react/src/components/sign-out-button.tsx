import { type ButtonHTMLAttributes, type ReactNode } from 'react'
import { useAuth } from '../hooks/use-auth'

export interface SignOutButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode
}

export function SignOutButton({
  children = 'Sign Out',
  ...props
}: SignOutButtonProps) {
  const { signOut, signedIn } = useAuth()

  if (!signedIn) return null

  return (
    <button type="button" onClick={signOut} {...props}>
      {children}
    </button>
  )
}
