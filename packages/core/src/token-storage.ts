import type { TokenStorage } from './types'

export const REFRESH_TOKEN_KEY = 'clowk_refresh_token'

/**
 * Survives a reload but nothing more. The refresh token is deliberately the
 * only thing stored: the access token stays in memory, so the value at rest is
 * one that rotation invalidates on first reuse.
 */
export function createLocalStorage(): TokenStorage {
  return {
    get(key) {
      try {
        return window.localStorage.getItem(key)
      } catch {
        return null
      }
    },
    set(key, value) {
      try {
        window.localStorage.setItem(key, value)
      } catch {
        // Safari private mode and disabled storage both throw here. Losing
        // persistence degrades to a re-login, which beats crashing the app.
      }
    },
    remove(key) {
      try {
        window.localStorage.removeItem(key)
      } catch {
        // Same as above.
      }
    },
  }
}

/** For SSR, tests, and callers that would rather not persist at all. */
export function createMemoryStorage(): TokenStorage {
  const store = new Map<string, string>()

  return {
    get: (key) => store.get(key) ?? null,
    set: (key, value) => void store.set(key, value),
    remove: (key) => void store.delete(key),
  }
}

export function defaultStorage(): TokenStorage {
  const usable = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

  return usable ? createLocalStorage() : createMemoryStorage()
}
