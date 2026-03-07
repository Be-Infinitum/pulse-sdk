import type { RateLimitInfo } from "./types";

/**
 * Base error class for all Pulse SDK errors.
 * All errors thrown by the SDK extend this class.
 *
 * @example
 * ```typescript
 * try {
 *   await pulse.paymentLinks.create({ title: 'Test', amount: '10.00' })
 * } catch (err) {
 *   if (err instanceof PulseError) {
 *     console.error('Pulse SDK error:', err.message)
 *   }
 * }
 * ```
 */
export class PulseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PulseError";
  }
}

/**
 * Error thrown when the Pulse API returns a non-2xx response.
 * Contains the HTTP status code, machine-readable error code, and optional rate limit info.
 *
 * @example
 * ```typescript
 * try {
 *   await pulse.paymentLinks.create({ title: 'Test', amount: '10.00' })
 * } catch (err) {
 *   if (err instanceof PulseApiError) {
 *     console.error(`API error ${err.status}: [${err.errorCode}] ${err.message}`)
 *   }
 * }
 * ```
 */
export class PulseApiError extends PulseError {
  /** HTTP status code (e.g. 400, 404, 500). */
  public readonly status: number;
  /** Machine-readable error code (e.g. `"unauthorized"`, `"not_found"`). */
  public readonly errorCode: string;
  /** Rate limit info from response headers, if available. */
  public readonly rateLimit?: RateLimitInfo;

  constructor(status: number, errorCode: string, message: string, rateLimit?: RateLimitInfo) {
    super(message);
    this.name = "PulseApiError";
    this.status = status;
    this.errorCode = errorCode;
    this.rateLimit = rateLimit;
  }
}

/**
 * Error thrown when the API key is invalid, expired, or revoked (HTTP 401).
 *
 * @example
 * ```typescript
 * try {
 *   await pulse.paymentLinks.list()
 * } catch (err) {
 *   if (err instanceof PulseAuthenticationError) {
 *     console.error('Bad API key — check your sk_live_ key')
 *   }
 * }
 * ```
 */
export class PulseAuthenticationError extends PulseApiError {
  constructor(message: string = "Invalid API key") {
    super(401, "unauthorized", message);
    this.name = "PulseAuthenticationError";
  }
}

/**
 * Error thrown when the rate limit is exceeded (HTTP 429).
 * Check `retryAfter` for the number of seconds to wait before retrying.
 *
 * @example
 * ```typescript
 * try {
 *   await pulse.paymentLinks.list()
 * } catch (err) {
 *   if (err instanceof PulseRateLimitError) {
 *     console.log(`Rate limited. Retry in ${err.retryAfter}s`)
 *     await new Promise(r => setTimeout(r, err.retryAfter * 1000))
 *   }
 * }
 * ```
 */
export class PulseRateLimitError extends PulseApiError {
  /** Number of seconds to wait before retrying. */
  public readonly retryAfter: number;

  constructor(retryAfter: number, rateLimit?: RateLimitInfo) {
    super(429, "rate_limit_exceeded", "Rate limit exceeded", rateLimit);
    this.name = "PulseRateLimitError";
    this.retryAfter = retryAfter;
  }
}

/**
 * Error thrown when a prepaid customer has insufficient credit (HTTP 402).
 * Occurs when `track()` is called on a prepaid product with zero balance.
 *
 * @example
 * ```typescript
 * try {
 *   await pulse.metering.track({ meterId: 'tokens', customerId: 'user_123', value: 100 })
 * } catch (err) {
 *   if (err instanceof PulseCreditExhaustedError) {
 *     console.log('Customer needs to purchase more credits')
 *   }
 * }
 * ```
 */
export class PulseCreditExhaustedError extends PulseApiError {
  constructor(message: string = "Insufficient credit balance") {
    super(402, "credit_exhausted", message);
    this.name = "PulseCreditExhaustedError";
  }
}
