// Re-export React components and hooks
export {
  ClowkProvider,
  useAuth,
  useClowk,
  useToken,
  SignInButton,
  SignUpButton,
  SignOutButton,
  ClowkContext,
} from '@clowk/react'

export type {
  ClowkProviderProps,
  ClowkAuthState,
  SignInButtonProps,
  SignUpButtonProps,
  SignOutButtonProps,
} from '@clowk/react'

// Re-export core utilities
export {
  configure,
  getConfig,
  resetConfig,
  ClowkClient,
  JwtVerifier,
  SubdomainResolver,
  TokenExtractor,
  ClowkError,
  ConfigurationError,
  InvalidStateError,
  InvalidTokenError,
} from '@clowk/core'

export type { ClowkConfig, ClowkClientOptions, JwtPayload } from '@clowk/core'
