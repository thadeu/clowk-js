import type { MiddlewareHandler, Context } from 'hono'
import { TokenExtractor, JwtVerifier, ClowkClient } from '@clowk/core'
import type { JwtPayload, SessionInfo } from '@clowk/core'

declare module 'hono' {
  interface ContextVariableMap {
    auth: JwtPayload | null
    clowkSession: SessionInfo | null
  }
}

export interface ClowkMiddlewareOptions {
  secretKey?: string
  publishableKey?: string
  tokenParam?: string
  cookieKey?: string
  enforceActiveSession?: boolean
  onSessionExpired?: (c: Context, session: SessionInfo) => Response | Promise<Response>
}

function extractCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {}

  for (const pair of cookieHeader.split(';')) {
    const [key, ...rest] = pair.trim().split('=')

    if (key) cookies[key.trim()] = rest.join('=').trim()
  }

  return cookies
}

function extractToken(c: Context, extractor: TokenExtractor): string | null {
  const url = new URL(c.req.url)
  const params: Record<string, string> = {}

  url.searchParams.forEach((v, k) => {
    params[k] = v
  })

  const cookieHeader = c.req.header('cookie') ?? ''
  const cookies = extractCookies(cookieHeader)

  return extractor.extract({
    params,
    headers: {
      get(name: string) {
        return c.req.header(name) ?? null
      },
    },
    cookies,
  })
}

export function clowkMiddleware(options?: ClowkMiddlewareOptions): MiddlewareHandler {
  const extractor = new TokenExtractor({
    tokenParam: options?.tokenParam,
    cookieKey: options?.cookieKey,
  })

  const verifier = new JwtVerifier({
    secretKey: options?.secretKey,
  })

  const client = options?.secretKey
    ? new ClowkClient({ secretKey: options.secretKey, publishableKey: options?.publishableKey })
    : null

  return async (c, next) => {
    const token = extractToken(c, extractor)

    if (!token) {
      c.set('auth', null)
      c.set('clowkSession', null)

      return next()
    }

    let payload: JwtPayload | null = null

    try {
      payload = await verifier.verify(token)
      c.set('auth', payload)
    } catch {
      c.set('auth', null)
      c.set('clowkSession', null)

      return next()
    }

    if (client && payload?.session_id) {
      try {
        const result = await client.tokens.verifyWithSession(token)
        c.set('clowkSession', result.session ?? null)
      } catch {
        c.set('clowkSession', null)
      }
    } else {
      c.set('clowkSession', null)
    }

    if (options?.enforceActiveSession && c.get('clowkSession')?.status !== 'active') {
      const session = c.get('clowkSession')

      if (options.onSessionExpired && session) {
        return options.onSessionExpired(c, session)
      }

      return c.json({ error: 'Session expired or inactive' }, 401)
    }

    return next()
  }
}

export function requireAuth(options?: ClowkMiddlewareOptions): MiddlewareHandler {
  const middleware = clowkMiddleware(options)

  return async (c, next) => {
    let proceeded = false

    await middleware(c, async () => {
      if (!c.get('auth')) {
        return
      }

      proceeded = true
      await next()
    })

    if (!proceeded && !c.res.headers.has('content-type')) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
  }
}
