import { createContext } from 'react'
import type { JwtPayload } from '@clowk/core'

export interface ClowkAuthState {
  user: JwtPayload | null
  token: string | null
  signedIn: boolean
  isLoading: boolean
  signOut: () => void
}

export const ClowkContext = createContext<ClowkAuthState | null>(null)
