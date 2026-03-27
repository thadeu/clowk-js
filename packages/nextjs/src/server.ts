import { cookies, headers } from 'next/headers'
import { JwtVerifier, ClowkClient, getConfig } from '@clowk/core'
import type { JwtPayload, SessionInfo } from '@clowk/core'

export interface AuthResult {
  user: JwtPayload | null
  token: string | null
  signedIn: boolean
  session: SessionInfo | null
}

export async function auth(options?: { secretKey?: string; publishableKey?: string }): Promise<AuthResult> {
  const config = getConfig()
  const verifier = new JwtVerifier({ secretKey: options?.secretKey })

  const cookieStore = await cookies()
  let token = cookieStore.get(config.cookieKey)?.value ?? null

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
    return { user: null, token: null, signedIn: false, session: null }
  }

  try {
    const user = await verifier.verify(token)

    let session: SessionInfo | null = null

    if (options?.secretKey && user.session_id) {
      try {
        const client = new ClowkClient({
          secretKey: options.secretKey,
          publishableKey: options?.publishableKey,
        })

        const result = await client.tokens.verifyWithSession(token)
        session = result.session ?? null
      } catch {
        session = null
      }
    }

    return { user, token, signedIn: true, session }
  } catch {
    return { user: null, token: null, signedIn: false, session: null }
  }
}
