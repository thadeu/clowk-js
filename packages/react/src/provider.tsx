import { useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react'
import { ClowkClient, TokenManager, getConfig, configure } from '@clowk/core'
import type { JwtPayload, SessionInfo, TokenStorage } from '@clowk/core'
import { ClowkContext, type ClowkAuthState } from './context'

export interface ClowkProviderProps {
  children: ReactNode
  publishableKey?: string
  secretKey?: string
  tokenParam?: string
  afterSignOutPath?: string
  sessionCheckInterval?: number
  onSessionExpired?: (session: SessionInfo) => void
  /** Where the refresh token is kept. Defaults to `localStorage` in the browser. */
  storage?: TokenStorage
  /** Renew this many seconds before the access token expires. */
  refreshSkew?: number
}

export function ClowkProvider({
  children,
  publishableKey,
  secretKey,
  tokenParam,
  afterSignOutPath,
  sessionCheckInterval = 0,
  onSessionExpired,
  storage,
  refreshSkew,
}: ClowkProviderProps) {
  const [user, setUser] = useState<JwtPayload | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const prevStatusRef = useRef<string | null>(null)

  const config = getConfig()
  const paramName = tokenParam ?? config.tokenParam
  const signOutPath = afterSignOutPath ?? config.afterSignOutPath

  if (publishableKey) configure({ publishableKey })

  const manager = useMemo(
    () =>
      new TokenManager({
        publishableKey: publishableKey ?? config.publishableKey,
        storage,
        refreshSkew,
        onChange: (state) => {
          setToken(state.token)
          setUser(state.user)
        },
      }),
    [publishableKey, config.publishableKey, storage, refreshSkew],
  )

  useEffect(() => {
    let cancelled = false

    const bootstrap = async () => {
      try {
        const url = new URL(window.location.href)
        const urlToken = url.searchParams.get(paramName)

        if (urlToken) {
          url.searchParams.delete(paramName)
          window.history.replaceState({}, '', url.toString())

          await manager.exchange(urlToken)
        } else {
          // The access token lives in memory, so on a reload the only thing
          // that can prove the user is still signed in is the stored refresh
          // token. Skipping this is what made every reload a logout.
          await manager.restore()
        }
      } catch {
        manager.clear()
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    bootstrap()

    return () => {
      cancelled = true
    }
  }, [manager, paramName])

  const getToken = useCallback(() => manager.getToken(), [manager])

  useEffect(() => {
    if (!token || !secretKey || sessionCheckInterval <= 0) return

    const client = new ClowkClient({ secretKey, publishableKey })

    const checkSession = async () => {
      try {
        const result = await client.tokens.verifyWithSession(token)
        const newSession = result.session ?? null

        setSession(newSession)

        if (newSession && newSession.status !== 'active' && prevStatusRef.current === 'active') {
          onSessionExpired?.(newSession)
        }

        prevStatusRef.current = newSession?.status ?? null
      } catch {
        setSession(null)
      }
    }

    checkSession()
    const interval = setInterval(checkSession, sessionCheckInterval * 1000)

    return () => clearInterval(interval)
  }, [token, secretKey, publishableKey, sessionCheckInterval, onSessionExpired])

  const signOut = useCallback(() => {
    setSession(null)

    // Revoking server-side is what actually ends the session; clearing local
    // state alone would leave a live refresh token behind.
    void manager.signOut().finally(() => {
      document.cookie = `${config.cookieKey}=; Max-Age=0; Path=/; SameSite=Lax`

      if (signOutPath) window.location.href = signOutPath
    })
  }, [manager, config.cookieKey, signOutPath])

  const value = useMemo<ClowkAuthState>(
    () => ({
      user,
      token,
      signedIn: user !== null,
      isLoading,
      session,
      signOut,
      getToken,
    }),
    [user, token, isLoading, session, signOut, getToken],
  )

  return <ClowkContext.Provider value={value}>{children}</ClowkContext.Provider>
}
