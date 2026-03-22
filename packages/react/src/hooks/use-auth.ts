import { useContext } from 'react'
import { ClowkContext, type ClowkAuthState } from '../context'

export function useAuth(): ClowkAuthState {
  const context = useContext(ClowkContext)

  if (!context) {
    throw new Error('useAuth must be used within a <ClowkProvider>')
  }

  return context
}
