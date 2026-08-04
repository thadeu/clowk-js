import { describe, it, expect, vi, afterEach } from 'vitest'
import { createLocalStorage, createMemoryStorage, defaultStorage } from '../src/token-storage'

describe('token storage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('memory storage', () => {
    it('round-trips a value', () => {
      const storage = createMemoryStorage()
      storage.set('k', 'v')

      expect(storage.get('k')).toBe('v')
    })

    it('reports a missing key as null', () => {
      expect(createMemoryStorage().get('nope')).toBeNull()
    })

    it('removes a value', () => {
      const storage = createMemoryStorage()
      storage.set('k', 'v')
      storage.remove('k')

      expect(storage.get('k')).toBeNull()
    })
  })

  describe('local storage', () => {
    // Safari private mode and disabled storage both throw on access. Losing
    // persistence should degrade to a re-login, not crash the app.
    it('survives a throwing localStorage', () => {
      vi.stubGlobal('window', {
        get localStorage(): Storage {
          throw new Error('SecurityError')
        },
      })

      const storage = createLocalStorage()

      expect(() => storage.set('k', 'v')).not.toThrow()
      expect(() => storage.remove('k')).not.toThrow()
      expect(storage.get('k')).toBeNull()
    })

    it('reads and writes through window.localStorage', () => {
      const backing = new Map<string, string>()
      vi.stubGlobal('window', {
        localStorage: {
          getItem: (k: string) => backing.get(k) ?? null,
          setItem: (k: string, v: string) => void backing.set(k, v),
          removeItem: (k: string) => void backing.delete(k),
        },
      })

      const storage = createLocalStorage()
      storage.set('k', 'v')

      expect(backing.get('k')).toBe('v')
      expect(storage.get('k')).toBe('v')
    })
  })

  describe('defaultStorage', () => {
    it('falls back to memory when there is no window', () => {
      vi.stubGlobal('window', undefined)

      const storage = defaultStorage()
      storage.set('k', 'v')

      expect(storage.get('k')).toBe('v')
    })
  })
})
