export class ClowkError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ClowkError'
  }
}

export class ConfigurationError extends ClowkError {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigurationError'
  }
}

export class InvalidStateError extends ClowkError {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidStateError'
  }
}

export class InvalidTokenError extends ClowkError {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidTokenError'
  }
}
