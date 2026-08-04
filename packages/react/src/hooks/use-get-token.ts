import { useContext } from 'react'
import { ClowkContext } from '../context'

/**
 * Returns a function that resolves to a currently-valid access token, renewing
 * it when needed. Prefer this over `useToken()` when the token is about to be
 * sent somewhere: that hook hands back a snapshot which may already be stale.
 */
export function useGetToken(): () => Promise<string | null> {
  const context = useContext(ClowkContext)

  if (!context) {
    throw new Error('useGetToken must be used within a <ClowkProvider>')
  }

  return context.getToken
}
