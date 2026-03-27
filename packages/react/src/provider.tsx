import { useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react'
import { JwtVerifier, ClowkClient, getConfig, configure } from '@clowk/core'
import type { JwtPayload, SessionInfo } from '@clowk/core'
import { ClowkContext, type ClowkAuthState } from './context'

export interface ClowkProviderProps {
  children: ReactNode
  publishableKey?: string
  secretKey?: string
  tokenParam?: string
  afterSignOutPath?: string
  sessionCheckInterval?: number
  onSessionExpired?: (session: SessionInfo) => void
}

export function ClowkProvider({
  children,
  publishableKey,
  secretKey,
  tokenParam,
  afterSignOutPath,
  sessionCheckInterval = 0,
  onSessionExpired,
}: ClowkProviderProps) {
  const [user, setUser] = useState<JwtPayload | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const prevStatusRef = useRef<string | null>(null)

  const config = getConfig()
  const paramName = tokenParam ?? config.tokenParam
  const signOutPath = afterSignOutPath ?? config.afterSignOutPath

  useEffect(() => {
    if (publishableKey) {
      configure({ publishableKey })
    }
  }, [publishableKey])

  useEffect(() => {
    const extractAndVerify = async () => {
      try {
        const url = new URL(window.location.href)
        const urlToken = url.searchParams.get(paramName)

        if (urlToken) {
          url.searchParams.delete(paramName)
          window.history.replaceState({}, '', url.toString())

          if (secretKey) {
            const verifier = new JwtVerifier({ secretKey })
            const payload = await verifier.verify(urlToken)

            setUser(payload)
          } else {
            const payloadB64 = urlToken.split('.')[1]

            if (payloadB64) {
              const json = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))

              setUser(JSON.parse(json))
            }
          }

          setToken(urlToken)
        }
      } catch {
        setUser(null)
        setToken(null)
      } finally {
        setIsLoading(false)
      }
    }

    extractAndVerify()
  }, [paramName, secretKey])

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
    setUser(null)
    setToken(null)
    setSession(null)

    document.cookie = `${config.cookieKey}=; Max-Age=0; Path=/; SameSite=Lax`

    if (signOutPath) {
      window.location.href = signOutPath
    }
  }, [config.cookieKey, signOutPath])

  const value = useMemo<ClowkAuthState>(
    () => ({
      user,
      token,
      signedIn: user !== null,
      isLoading,
      session,
      signOut,
    }),
    [user, token, isLoading, session, signOut],
  )

  return <ClowkContext.Provider value={value}>{children}</ClowkContext.Provider>
}
