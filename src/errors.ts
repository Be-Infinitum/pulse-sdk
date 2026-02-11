import type { RateLimitInfo } from './types'

export class PulseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PulseError'
  }
}

export class PulseApiError extends PulseError {
  public readonly status: number
  public readonly errorCode: string
  public readonly rateLimit?: RateLimitInfo

  constructor(
    status: number,
    errorCode: string,
    message: string,
    rateLimit?: RateLimitInfo
  ) {
    super(message)
    this.name = 'PulseApiError'
    this.status = status
    this.errorCode = errorCode
    this.rateLimit = rateLimit
  }
}

export class PulseAuthenticationError extends PulseApiError {
  constructor(message: string = 'Invalid API key') {
    super(401, 'unauthorized', message)
    this.name = 'PulseAuthenticationError'
  }
}

export class PulseRateLimitError extends PulseApiError {
  public readonly retryAfter: number

  constructor(retryAfter: number, rateLimit?: RateLimitInfo) {
    super(429, 'rate_limit_exceeded', 'Rate limit exceeded', rateLimit)
    this.name = 'PulseRateLimitError'
    this.retryAfter = retryAfter
  }
}
