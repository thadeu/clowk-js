import { describe, it, expect, beforeEach } from 'vitest'
import { SignJWT } from 'jose'
import { JwtVerifier } from '../src/jwt-verifier'
import { ConfigurationError, InvalidTokenError } from '../src/errors'
import { resetConfig, configure } from '../src/config'

const SECRET_KEY = 'test-secret-key-for-jwt'

async function createToken(
  payload: Record<string, unknown>,
  secret: string = SECRET_KEY,
  options?: { expiresIn?: string; issuer?: string },
): Promise<string> {
  const key = new TextEncoder().encode(secret)

  let builder = new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })

  if (options?.issuer) {
    builder = builder.setIssuer(options.issuer)
  }

  if (options?.expiresIn) {
    builder = builder.setExpirationTime(options.expiresIn)
  }

  return builder.sign(key)
}

describe('JwtVerifier', () => {
  beforeEach(() => {
    resetConfig()
    configure({ secretKey: SECRET_KEY })
  })

  it('decodes a valid token correctly', async () => {
    const token = await createToken(
      { sub: 'user_123', email: 'user@example.com' },
      SECRET_KEY,
      { issuer: 'clowk', expiresIn: '1h' },
    )

    const verifier = new JwtVerifier()
    const payload = await verifier.verify(token)

    expect(payload.sub).toBe('user_123')
    expect(payload.email).toBe('user@example.com')
    expect(payload.iss).toBe('clowk')
  })

  it('throws ConfigurationError when secretKey is missing', async () => {
    resetConfig()
    const verifier = new JwtVerifier()

    await expect(verifier.verify('any.token.here')).rejects.toThrow(
      ConfigurationError,
    )
    await expect(verifier.verify('any.token.here')).rejects.toThrow(
      'missing Clowk secretKey',
    )
  })

  it('throws InvalidTokenError for expired token', async () => {
    const token = await createToken(
      { sub: 'user_123' },
      SECRET_KEY,
      { issuer: 'clowk', expiresIn: '-1h' },
    )

    const verifier = new JwtVerifier()

    await expect(verifier.verify(token)).rejects.toThrow(InvalidTokenError)
    await expect(verifier.verify(token)).rejects.toThrow('token expired')
  })

  it('throws InvalidTokenError for wrong key', async () => {
    const token = await createToken(
      { sub: 'user_123' },
      'wrong-secret-key',
      { issuer: 'clowk', expiresIn: '1h' },
    )

    const verifier = new JwtVerifier()

    await expect(verifier.verify(token)).rejects.toThrow(InvalidTokenError)
  })

  it('throws InvalidTokenError for malformed token', async () => {
    const verifier = new JwtVerifier()

    await expect(verifier.verify('not-a-jwt')).rejects.toThrow(
      InvalidTokenError,
    )
  })

  it('throws InvalidTokenError for invalid issuer', async () => {
    const token = await createToken(
      { sub: 'user_123' },
      SECRET_KEY,
      { issuer: 'other-issuer', expiresIn: '1h' },
    )

    const verifier = new JwtVerifier()

    await expect(verifier.verify(token)).rejects.toThrow(InvalidTokenError)
    await expect(verifier.verify(token)).rejects.toThrow('invalid issuer')
  })

  it('skips issuer verification when issuer is null', async () => {
    const token = await createToken(
      { sub: 'user_123' },
      SECRET_KEY,
      { issuer: 'any-issuer', expiresIn: '1h' },
    )

    const verifier = new JwtVerifier({ issuer: null })
    const payload = await verifier.verify(token)

    expect(payload.sub).toBe('user_123')
    expect(payload.iss).toBe('any-issuer')
  })

  it('throws InvalidTokenError for completely invalid input', async () => {
    const verifier = new JwtVerifier()

    await expect(verifier.verify('a.b.c')).rejects.toThrow(InvalidTokenError)
  })
})
