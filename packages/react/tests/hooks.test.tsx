import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { type ReactNode } from 'react'
import { resetConfig } from '@clowk/core'
import { ClowkProvider } from '../src/provider'
import { useAuth } from '../src/hooks/use-auth'
import { useToken } from '../src/hooks/use-token'
import { useClowk } from '../src/hooks/use-clowk'
import { ClowkClient } from '@clowk/core'

function Wrapper({ children }: { children: ReactNode }) {
  return <ClowkProvider>{children}</ClowkProvider>
}

describe('React Hooks', () => {
  beforeEach(() => {
    resetConfig()
  })

  describe('useAuth', () => {
    it('throws when used outside ClowkProvider', () => {
      expect(() => {
        renderHook(() => useAuth())
      }).toThrow('useAuth must be used within a <ClowkProvider>')
    })

    it('returns all expected properties', () => {
      const { result } = renderHook(() => useAuth(), { wrapper: Wrapper })

      expect(result.current).toHaveProperty('user')
      expect(result.current).toHaveProperty('token')
      expect(result.current).toHaveProperty('signedIn')
      expect(result.current).toHaveProperty('isLoading')
      expect(result.current).toHaveProperty('signOut')
    })

    it('signOut is a function', () => {
      const { result } = renderHook(() => useAuth(), { wrapper: Wrapper })
      expect(typeof result.current.signOut).toBe('function')
    })

    it('user is null when not authenticated', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: Wrapper })

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50))
      })

      expect(result.current.user).toBeNull()
      expect(result.current.signedIn).toBe(false)
    })

    it('token is null when not authenticated', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: Wrapper })

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50))
      })

      expect(result.current.token).toBeNull()
    })

    it('isLoading becomes false after initialization', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: Wrapper })

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50))
      })

      expect(result.current.isLoading).toBe(false)
    })

    it('returns same reference on re-render when state unchanged', () => {
      const { result, rerender } = renderHook(() => useAuth(), { wrapper: Wrapper })
      const first = result.current
      rerender()
      // useMemo should preserve reference
      expect(result.current).toBe(first)
    })
  })

  describe('useToken', () => {
    it('throws when used outside ClowkProvider', () => {
      expect(() => {
        renderHook(() => useToken())
      }).toThrow('useToken must be used within a <ClowkProvider>')
    })

    it('returns null when no token present', () => {
      const { result } = renderHook(() => useToken(), { wrapper: Wrapper })
      expect(result.current).toBeNull()
    })
  })

  describe('useClowk', () => {
    it('returns a ClowkClient instance', () => {
      const { result } = renderHook(() => useClowk())
      expect(result.current).toBeInstanceOf(ClowkClient)
    })

    it('memoizes the client instance across re-renders', () => {
      const { result, rerender } = renderHook(() => useClowk())
      const first = result.current
      rerender()
      expect(result.current).toBe(first)
    })

    it('creates new client when options change', () => {
      let opts = { apiBaseUrl: 'https://a.clowk.dev/client/v1' }
      const { result, rerender } = renderHook(() => useClowk(opts))
      const first = result.current

      opts = { apiBaseUrl: 'https://b.clowk.dev/client/v1' }
      rerender()
      // New reference because options object changed
      expect(result.current).not.toBe(first)
    })

    it('works without ClowkProvider (standalone)', () => {
      const { result } = renderHook(() => useClowk())
      expect(result.current).toBeInstanceOf(ClowkClient)
    })
  })
})
