import type { Request, Response, NextFunction } from 'express'
import { TokenExtractor, JwtVerifier, ClowkClient } from '@clowk/core'
import type { JwtPayload, SessionInfo } from '@clowk/core'

declare global {
  namespace Express {
    interface Request {
      auth?: JwtPayload | null
      clowkSession?: SessionInfo | null
    }
  }
}

export interface ClowkMiddlewareOptions {
  secretKey?: string
  publishableKey?: string
  tokenParam?: string
  cookieKey?: string
  enforceActiveSession?: boolean
  onSessionExpired?: (req: Request, res: Response, session: SessionInfo) => void
}

export function clowkMiddleware(options?: ClowkMiddlewareOptions) {
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

  return async (req: Request, res: Response, next: NextFunction) => {
    const token = extractor.extract({
      params: (req.query as Record<string, string>) ?? {},
      headers: req.headers as Record<string, string>,
      cookies: req.cookies ?? {},
    })

    if (!token) {
      req.auth = null
      req.clowkSession = null

      return next()
    }

    try {
      req.auth = await verifier.verify(token)
    } catch {
      req.auth = null
      req.clowkSession = null

      return next()
    }

    if (client && req.auth?.session_id) {
      try {
        const result = await client.tokens.verifyWithSession(token)
        req.clowkSession = result.session ?? null
      } catch {
        req.clowkSession = null
      }
    } else {
      req.clowkSession = null
    }

    if (options?.enforceActiveSession && req.clowkSession?.status !== 'active') {
      if (options.onSessionExpired && req.clowkSession) {
        options.onSessionExpired(req, res, req.clowkSession)

        return
      }

      res.status(401).json({ error: 'Session expired or inactive' })

      return
    }

    next()
  }
}

export function requireAuth(options?: ClowkMiddlewareOptions) {
  const middleware = clowkMiddleware(options)

  return async (req: Request, res: Response, next: NextFunction) => {
    await middleware(req, res, () => {
      if (!req.auth) {
        res.status(401).json({ error: 'Unauthorized' })

        return
      }

      next()
    })
  }
}
