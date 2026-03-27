import { createContext } from 'react'
import type { JwtPayload, SessionInfo } from '@clowk/core'

export interface ClowkAuthState {
  user: JwtPayload | null
  token: string | null
  signedIn: boolean
  isLoading: boolean
  session: SessionInfo | null
  signOut: () => void
}

export const ClowkContext = createContext<ClowkAuthState | null>(null)
