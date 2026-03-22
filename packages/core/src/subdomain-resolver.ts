import { getConfig } from './config'
import { ConfigurationError } from './errors'
import { ClowkClient } from './sdk/client'

interface CacheEntry {
  value: string
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()
const CACHE_TTL = 60_000 // 60 seconds in ms
const DEFAULT_SUBDOMAIN_BASE = 'clowk.dev'

function readCache(key: string): string | null {
  const entry = cache.get(key)
  if (!entry) return null

  if (entry.expiresAt > Date.now()) {
    return entry.value
  }

  cache.delete(key)
  return null
}

function writeCache(key: string, value: string): void {
  cache.set(key, {
    value,
    expiresAt: Date.now() + CACHE_TTL,
  })
}

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '')
}

function extractUrlFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null

  const data = payload as Record<string, unknown>
  const instance =
    data.instance && typeof data.instance === 'object'
      ? (data.instance as Record<string, unknown>)
      : data

  // Try explicit URL fields
  const explicitUrl =
    instance.url ?? instance.subdomain_url ?? instance.instance_url
  if (typeof explicitUrl === 'string' && explicitUrl) {
    return normalizeUrl(explicitUrl)
  }

  // Try host/domain fields (prepend https://)
  const host = instance.host ?? instance.domain ?? instance.hostname
  if (typeof host === 'string' && host) {
    const url = host.startsWith('http') ? host : `https://${host}`
    return normalizeUrl(url)
  }

  // Try subdomain field (build full URL)
  const subdomain = instance.subdomain
  if (typeof subdomain === 'string' && subdomain) {
    return normalizeUrl(`https://${subdomain}.${DEFAULT_SUBDOMAIN_BASE}`)
  }

  return null
}

export class SubdomainResolver {
  private readonly publishableKey: string | null
  private readonly subdomainUrl: string | null

  constructor(options?: {
    publishableKey?: string | null
    subdomainUrl?: string | null
  }) {
    const config = getConfig()
    this.publishableKey = options?.publishableKey ?? config.publishableKey
    this.subdomainUrl = options?.subdomainUrl ?? config.subdomainUrl
  }

  async resolveUrl(): Promise<string> {
    if (this.publishableKey) {
      return this.resolveFromKey(this.publishableKey)
    }

    if (this.subdomainUrl) {
      return normalizeUrl(this.subdomainUrl)
    }

    throw new ConfigurationError(
      'set publishableKey or subdomainUrl to build Clowk URLs',
    )
  }

  private async resolveFromKey(key: string): Promise<string> {
    const cacheKey = `instance-url:${key}`
    const cached = readCache(cacheKey)
    if (cached) return cached

    const client = new ClowkClient({ publishableKey: key })
    const response = await client.subdomains.findByPk(key)

    const url = extractUrlFromPayload(response.bodyParsed)
    if (!url) {
      throw new ConfigurationError(
        'could not resolve subdomain URL from API response',
      )
    }

    writeCache(cacheKey, url)
    return url
  }

  static clearCache(): void {
    cache.clear()
  }
}
