import { jwtVerify } from 'jose'
import type { JwtPayload } from './types'
import { getConfig } from './config'
import { ConfigurationError, InvalidTokenError } from './errors'

export class JwtVerifier {
  private readonly secretKey: string | null
  private readonly issuer: string | null

  constructor(options?: { secretKey?: string | null; issuer?: string | null }) {
    const config = getConfig()
    this.secretKey = options?.secretKey ?? config.secretKey
    this.issuer = options?.issuer !== undefined ? options.issuer : config.issuer
  }

  async verify(token: string): Promise<JwtPayload> {
    if (!this.secretKey) {
      throw new ConfigurationError('missing Clowk secretKey')
    }

    try {
      const secret = new TextEncoder().encode(this.secretKey)

      const { payload } = await jwtVerify(token, secret, {
        algorithms: ['HS256'],
        ...(this.issuer != null ? { issuer: this.issuer } : {}),
      })

      return payload as JwtPayload
    } catch (error) {
      if (error instanceof ConfigurationError) throw error

      const message = error instanceof Error ? error.message : String(error)

      if (message.includes('"exp" claim')) {
        throw new InvalidTokenError('token expired')
      }

      if (message.includes('"iss" claim')) {
        throw new InvalidTokenError(
          `invalid issuer: expected ${this.issuer}, got unexpected value`,
        )
      }

      throw new InvalidTokenError(message)
    }
  }
}
