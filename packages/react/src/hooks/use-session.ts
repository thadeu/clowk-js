import type { SessionInfo } from '@clowk/core'
import { useAuth } from './use-auth'

export function useSession(): SessionInfo | null {
  const { session } = useAuth()

  return session
}
