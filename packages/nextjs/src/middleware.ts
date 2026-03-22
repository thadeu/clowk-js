import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { JwtVerifier, TokenExtractor, getConfig } from '@clowk/core'
import type { JwtPayload } from '@clowk/core'

export interface ClowkMiddlewareOptions {
  secretKey?: string
  publicRoutes?: string[]
  signInUrl?: string
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {}
  for (const pair of cookieHeader.split(';')) {
    const [key, ...rest] = pair.trim().split('=')
    if (key) cookies[key.trim()] = rest.join('=').trim()
  }
  return cookies
}

function isPublicRoute(pathname: string, publicRoutes: string[]): boolean {
  return publicRoutes.some((route) => {
    if (route.endsWith('*')) {
      return pathname.startsWith(route.slice(0, -1))
    }
    return pathname === route
  })
}

export function clowkMiddleware(options?: ClowkMiddlewareOptions) {
  const config = getConfig()
  const publicRoutes = options?.publicRoutes ?? [
    '/',
    '/sign-in',
    '/sign-up',
    config.callbackPath,
    `${config.mountPath}/*`,
  ]

  const extractor = new TokenExtractor()
  const verifier = new JwtVerifier({ secretKey: options?.secretKey })

  return async (request: NextRequest): Promise<NextResponse> => {
    const { pathname } = request.nextUrl

    // Allow public routes
    if (isPublicRoute(pathname, publicRoutes)) {
      return NextResponse.next()
    }

    // Extract token
    const url = new URL(request.url)
    const params: Record<string, string> = {}
    url.searchParams.forEach((v, k) => {
      params[k] = v
    })

    const cookieHeader = request.headers.get('cookie') ?? ''
    const cookies = parseCookies(cookieHeader)

    const token = extractor.extract({
      params,
      headers: {
        get(name: string) {
          return request.headers.get(name)
        },
      },
      cookies,
    })

    if (!token) {
      const signInUrl = options?.signInUrl ?? '/sign-in'
      const redirectUrl = new URL(signInUrl, request.url)
      redirectUrl.searchParams.set('return_to', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    try {
      await verifier.verify(token)
      return NextResponse.next()
    } catch {
      const signInUrl = options?.signInUrl ?? '/sign-in'
      const redirectUrl = new URL(signInUrl, request.url)
      redirectUrl.searchParams.set('return_to', pathname)
      return NextResponse.redirect(redirectUrl)
    }
  }
}
