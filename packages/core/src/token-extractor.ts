import type { TokenRequest } from './types';
import { getConfig } from './config';

function getHeader(headers: TokenRequest['headers'], name: string): string | null {
  if (!headers) return null;

  if (typeof headers.get === 'function') {
    return headers.get(name);
  }

  // Case-insensitive lookup for plain object headers
  const lowerName = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lowerName) return value;
  }
  return null;
}

export class TokenExtractor {
  private readonly tokenParam: string;
  private readonly cookieKey: string;

  constructor(options?: { tokenParam?: string; cookieKey?: string }) {
    const config = getConfig();
    this.tokenParam = options?.tokenParam ?? config.tokenParam;
    this.cookieKey = options?.cookieKey ?? config.cookieKey;
  }

  extract(request: TokenRequest): string | null {
    return this.fromParams(request) ?? this.fromBearer(request) ?? this.fromCookies(request) ?? null;
  }

  private fromParams(req: TokenRequest): string | undefined {
    const value = req.params?.[this.tokenParam];
    return value || undefined;
  }

  private fromBearer(req: TokenRequest): string | undefined {
    const authorization = getHeader(req.headers, 'authorization');
    if (!authorization) return undefined;

    const [scheme, token] = authorization.split(' ', 2);
    if (scheme?.toLowerCase() !== 'bearer') return undefined;

    return token || undefined;
  }

  private fromCookies(req: TokenRequest): string | undefined {
    const value = req.cookies?.[this.cookieKey];
    return value || undefined;
  }
}
