import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import { JwtVerifier, SubdomainResolver, getConfig, configure } from '@clowk/core'
import type { JwtPayload } from '@clowk/core'
import { ClowkContext, type ClowkAuthState } from './context'

export interface ClowkProviderProps {
  children: ReactNode
  publishableKey?: string
  secretKey?: string
  tokenParam?: string
  afterSignOutPath?: string
}

export function ClowkProvider({
  children,
  publishableKey,
  secretKey,
  tokenParam,
  afterSignOutPath,
}: ClowkProviderProps) {
  const [user, setUser] = useState<JwtPayload | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const config = getConfig()
  const paramName = tokenParam ?? config.tokenParam
  const signOutPath = afterSignOutPath ?? config.afterSignOutPath

  // Apply publishableKey to global config if provided
  useEffect(() => {
    if (publishableKey) {
      configure({ publishableKey })
    }
  }, [publishableKey])

  // Extract token from URL on mount
  useEffect(() => {
    const extractAndVerify = async () => {
      try {
        const url = new URL(window.location.href)
        const urlToken = url.searchParams.get(paramName)

        if (urlToken) {
          // Remove token from URL without reload
          url.searchParams.delete(paramName)
          window.history.replaceState({}, '', url.toString())

          // Verify if secretKey available, otherwise trust the token
          if (secretKey) {
            const verifier = new JwtVerifier({ secretKey })
            const payload = await verifier.verify(urlToken)
            setUser(payload)
          } else {
            // Decode without verification (client-side, no secret)
            const payloadB64 = urlToken.split('.')[1]
            if (payloadB64) {
              const json = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))
              setUser(JSON.parse(json))
            }
          }

          setToken(urlToken)
        }
      } catch {
        // Token invalid or expired — clear state
        setUser(null)
        setToken(null)
      } finally {
        setIsLoading(false)
      }
    }

    extractAndVerify()
  }, [paramName, secretKey])

  const signOut = useCallback(() => {
    setUser(null)
    setToken(null)

    // Clear cookie
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
      signOut,
    }),
    [user, token, isLoading, signOut],
  )

  return <ClowkContext.Provider value={value}>{children}</ClowkContext.Provider>
}
