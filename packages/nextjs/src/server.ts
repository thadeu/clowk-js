import { cookies, headers } from 'next/headers'
import { JwtVerifier, getConfig } from '@clowk/core'
import type { JwtPayload } from '@clowk/core'

export interface AuthResult {
  user: JwtPayload | null
  token: string | null
  signedIn: boolean
}

export async function auth(options?: { secretKey?: string }): Promise<AuthResult> {
  const config = getConfig()
  const verifier = new JwtVerifier({ secretKey: options?.secretKey })

  // Try cookie first
  const cookieStore = await cookies()
  let token = cookieStore.get(config.cookieKey)?.value ?? null

  // Try Authorization header
  if (!token) {
    const headerStore = await headers()
    const authorization = headerStore.get('authorization')
    if (authorization) {
      const [scheme, bearerToken] = authorization.split(' ', 2)
      if (scheme?.toLowerCase() === 'bearer' && bearerToken) {
        token = bearerToken
      }
    }
  }

  if (!token) {
    return { user: null, token: null, signedIn: false }
  }

  try {
    const user = await verifier.verify(token)
    return { user, token, signedIn: true }
  } catch {
    return { user: null, token: null, signedIn: false }
  }
}
