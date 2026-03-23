import type { ClowkConfig } from './types'

function createDefaultConfig(): ClowkConfig {
  return {
    appBaseUrl: 'https://app.clowk.in',
    secretKey: null,
    publishableKey: null,
    subdomainUrl: null,
    afterSignInPath: '/',
    afterSignOutPath: '/',
    mountPath: '/clowk',
    callbackPath: '/clowk/oauth/callback',
    cookieKey: 'clowk_token',
    sessionKey: 'clowk',
    tokenParam: 'token',
    issuer: 'clowk',
    httpOpenTimeout: 5,
    httpReadTimeout: 10,
    httpWriteTimeout: 10,
    httpRetryAttempts: 2,
    httpRetryInterval: 0.05,
    httpLogger: null,
  }
}

let config: ClowkConfig = createDefaultConfig()

export function configure(overrides: Partial<ClowkConfig>): void {
  Object.assign(config, overrides)
}

export function getConfig(): ClowkConfig {
  return config
}

export function resetConfig(): void {
  config = createDefaultConfig()
}
