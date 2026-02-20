import { describe, it, expect } from 'vitest'
import {
  PulseError,
  PulseApiError,
  PulseAuthenticationError,
  PulseRateLimitError,
} from '../errors'

describe('PulseError', () => {
  it('is an instance of Error', () => {
    const err = new PulseError('something went wrong')
    expect(err).toBeInstanceOf(Error)
  })

  it('has name PulseError', () => {
    const err = new PulseError('msg')
    expect(err.name).toBe('PulseError')
  })

  it('preserves message', () => {
    const err = new PulseError('custom message')
    expect(err.message).toBe('custom message')
  })
})

describe('PulseApiError', () => {
  it('is an instance of PulseError', () => {
    const err = new PulseApiError(400, 'bad_request', 'Invalid input')
    expect(err).toBeInstanceOf(PulseError)
  })

  it('is an instance of Error', () => {
    const err = new PulseApiError(400, 'bad_request', 'Invalid input')
    expect(err).toBeInstanceOf(Error)
  })

  it('preserves status, errorCode, and message', () => {
    const err = new PulseApiError(404, 'not_found', 'Resource not found')
    expect(err.status).toBe(404)
    expect(err.errorCode).toBe('not_found')
    expect(err.message).toBe('Resource not found')
  })

  it('preserves rateLimit info when provided', () => {
    const rateLimit = { limit: 100, remaining: 0, reset: 1700000000 }
    const err = new PulseApiError(429, 'rate_limit', 'Too many', rateLimit)
    expect(err.rateLimit).toEqual(rateLimit)
  })

  it('has undefined rateLimit when not provided', () => {
    const err = new PulseApiError(500, 'server_error', 'Oops')
    expect(err.rateLimit).toBeUndefined()
  })

  it('has name PulseApiError', () => {
    const err = new PulseApiError(400, 'bad_request', 'Bad')
    expect(err.name).toBe('PulseApiError')
  })
})

describe('PulseAuthenticationError', () => {
  it('is an instance of PulseApiError', () => {
    const err = new PulseAuthenticationError()
    expect(err).toBeInstanceOf(PulseApiError)
  })

  it('is an instance of PulseError', () => {
    const err = new PulseAuthenticationError()
    expect(err).toBeInstanceOf(PulseError)
  })

  it('defaults to status 401 and errorCode unauthorized', () => {
    const err = new PulseAuthenticationError()
    expect(err.status).toBe(401)
    expect(err.errorCode).toBe('unauthorized')
  })

  it('defaults message to Invalid API key', () => {
    const err = new PulseAuthenticationError()
    expect(err.message).toBe('Invalid API key')
  })

  it('accepts custom message', () => {
    const err = new PulseAuthenticationError('Token expired')
    expect(err.message).toBe('Token expired')
    expect(err.status).toBe(401)
  })

  it('has name PulseAuthenticationError', () => {
    const err = new PulseAuthenticationError()
    expect(err.name).toBe('PulseAuthenticationError')
  })
})

describe('PulseRateLimitError', () => {
  it('is an instance of PulseApiError', () => {
    const err = new PulseRateLimitError(30)
    expect(err).toBeInstanceOf(PulseApiError)
  })

  it('has status 429 and rate_limit_exceeded errorCode', () => {
    const err = new PulseRateLimitError(60)
    expect(err.status).toBe(429)
    expect(err.errorCode).toBe('rate_limit_exceeded')
  })

  it('preserves retryAfter', () => {
    const err = new PulseRateLimitError(45)
    expect(err.retryAfter).toBe(45)
  })

  it('preserves rateLimit info', () => {
    const rateLimit = { limit: 100, remaining: 0, reset: 1700000000 }
    const err = new PulseRateLimitError(30, rateLimit)
    expect(err.rateLimit).toEqual(rateLimit)
  })

  it('has message Rate limit exceeded', () => {
    const err = new PulseRateLimitError(10)
    expect(err.message).toBe('Rate limit exceeded')
  })

  it('has name PulseRateLimitError', () => {
    const err = new PulseRateLimitError(10)
    expect(err.name).toBe('PulseRateLimitError')
  })
})
