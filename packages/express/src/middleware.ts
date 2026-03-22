import type { Request, Response, NextFunction } from 'express'
import { TokenExtractor, JwtVerifier } from '@clowk/core'
import type { JwtPayload } from '@clowk/core'

declare global {
  namespace Express {
    interface Request {
      auth?: JwtPayload | null
    }
  }
}

export interface ClowkMiddlewareOptions {
  secretKey?: string
  tokenParam?: string
  cookieKey?: string
}

export function clowkMiddleware(options?: ClowkMiddlewareOptions) {
  const extractor = new TokenExtractor({
    tokenParam: options?.tokenParam,
    cookieKey: options?.cookieKey,
  })
  const verifier = new JwtVerifier({
    secretKey: options?.secretKey,
  })

  return async (req: Request, _res: Response, next: NextFunction) => {
    const token = extractor.extract({
      params: (req.query as Record<string, string>) ?? {},
      headers: req.headers as Record<string, string>,
      cookies: req.cookies ?? {},
    })

    if (!token) {
      req.auth = null
      return next()
    }

    try {
      req.auth = await verifier.verify(token)
    } catch {
      req.auth = null
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
