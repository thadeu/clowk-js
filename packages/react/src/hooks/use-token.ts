import { useContext } from 'react'
import { ClowkContext } from '../context'

export function useToken(): string | null {
  const context = useContext(ClowkContext)

  if (!context) {
    throw new Error('useToken must be used within a <ClowkProvider>')
  }

  return context.token
}
