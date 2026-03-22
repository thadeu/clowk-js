import type { MiddlewareHandler, Context } from 'hono'
import { TokenExtractor, JwtVerifier } from '@clowk/core'
import type { JwtPayload } from '@clowk/core'

declare module 'hono' {
  interface ContextVariableMap {
    auth: JwtPayload | null
  }
}

export interface ClowkMiddlewareOptions {
  secretKey?: string
  tokenParam?: string
  cookieKey?: string
}

function extractCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {}
  for (const pair of cookieHeader.split(';')) {
    const [key, ...rest] = pair.trim().split('=')
    if (key) cookies[key.trim()] = rest.join('=').trim()
  }
  return cookies
}

export function clowkMiddleware(options?: ClowkMiddlewareOptions): MiddlewareHandler {
  const extractor = new TokenExtractor({
    tokenParam: options?.tokenParam,
    cookieKey: options?.cookieKey,
  })
  const verifier = new JwtVerifier({
    secretKey: options?.secretKey,
  })

  return async (c, next) => {
    const url = new URL(c.req.url)
    const params: Record<string, string> = {}
    url.searchParams.forEach((v, k) => {
      params[k] = v
    })

    const cookieHeader = c.req.header('cookie') ?? ''
    const cookies = extractCookies(cookieHeader)

    const token = extractor.extract({
      params,
      headers: {
        get(name: string) {
          return c.req.header(name) ?? null
        },
      },
      cookies,
    })

    if (!token) {
      c.set('auth', null)
      return next()
    }

    try {
      const payload = await verifier.verify(token)
      c.set('auth', payload)
    } catch {
      c.set('auth', null)
    }

    return next()
  }
}

export function requireAuth(options?: ClowkMiddlewareOptions): MiddlewareHandler {
  const extractor = new TokenExtractor({
    tokenParam: options?.tokenParam,
    cookieKey: options?.cookieKey,
  })
  const verifier = new JwtVerifier({
    secretKey: options?.secretKey,
  })

  return async (c, next) => {
    const url = new URL(c.req.url)
    const params: Record<string, string> = {}
    url.searchParams.forEach((v, k) => {
      params[k] = v
    })

    const cookieHeader = c.req.header('cookie') ?? ''
    const cookies = extractCookies(cookieHeader)

    const token = extractor.extract({
      params,
      headers: {
        get(name: string) {
          return c.req.header(name) ?? null
        },
      },
      cookies,
    })

    if (!token) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    try {
      const payload = await verifier.verify(token)
      c.set('auth', payload)
      await next()
    } catch {
      return c.json({ error: 'Unauthorized' }, 401)
    }
  }
}
