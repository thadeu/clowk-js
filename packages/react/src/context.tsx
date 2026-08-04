import { createContext } from 'react'
import type { JwtPayload, SessionInfo } from '@clowk/core'

export interface ClowkAuthState {
  user: JwtPayload | null
  token: string | null
  signedIn: boolean
  isLoading: boolean
  session: SessionInfo | null
  signOut: () => void
  /**
   * The token to send with a request, renewed if it is expired or close to it.
   * Prefer this over reading `token` directly: that value is a snapshot and may
   * already be stale by the time a request goes out.
   */
  getToken: () => Promise<string | null>
}

export const ClowkContext = createContext<ClowkAuthState | null>(null)
