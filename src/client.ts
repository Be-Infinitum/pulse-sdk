import {
  PulseError,
  PulseApiError,
  PulseAuthenticationError,
  PulseRateLimitError,
} from './errors'
import type { RateLimitInfo } from './types'

const DEFAULT_BASE_URL = 'https://api.beinfi.com'

export class HttpClient {
  private readonly apiKey: string
  private readonly baseUrl: string

  constructor(apiKey: string, baseUrl?: string) {
    if (!apiKey.startsWith('sk_live_')) {
      throw new PulseError(
        'Invalid API key format. Keys must start with "sk_live_"'
      )
    }
    this.apiKey = apiKey
    this.baseUrl = (baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '')
  }

  async request<T>(
    method: string,
    path: string,
    options?: { body?: unknown; query?: Record<string, string | number | undefined> }
  ): Promise<T> {
    let url = `${this.baseUrl}/api/v1${path}`

    if (options?.query) {
      const params = new URLSearchParams()
      for (const [key, value] of Object.entries(options.query)) {
        if (value !== undefined) {
          params.set(key, String(value))
        }
      }
      const qs = params.toString()
      if (qs) url += `?${qs}`
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    }

    const response = await fetch(url, {
      method,
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    })

    const rateLimit = this.parseRateLimit(response.headers)

    if (!response.ok) {
      this.handleError(response.status, await this.safeJson(response), rateLimit)
    }

    // 204 No Content
    if (response.status === 204) {
      return undefined as T
    }

    const json = await response.json()

    // Unwrap { data: ... } envelope
    if (json && typeof json === 'object' && 'data' in json) {
      return json.data as T
    }

    return json as T
  }

  private parseRateLimit(headers: Headers): RateLimitInfo | undefined {
    const limit = headers.get('X-RateLimit-Limit')
    const remaining = headers.get('X-RateLimit-Remaining')
    const reset = headers.get('X-RateLimit-Reset')

    if (limit && remaining && reset) {
      return {
        limit: Number(limit),
        remaining: Number(remaining),
        reset: Number(reset),
      }
    }
    return undefined
  }

  private async safeJson(response: Response): Promise<Record<string, unknown> | null> {
    try {
      return await response.json()
    } catch {
      return null
    }
  }

  private handleError(
    status: number,
    body: Record<string, unknown> | null,
    rateLimit?: RateLimitInfo
  ): never {
    const errorCode = (body?.error as string) ?? 'unknown_error'
    const message = (body?.message as string) ?? `Request failed with status ${status}`

    if (status === 401) {
      throw new PulseAuthenticationError(message)
    }

    if (status === 429) {
      const retryAfter = rateLimit?.reset
        ? Math.max(0, rateLimit.reset - Math.floor(Date.now() / 1000))
        : 60
      throw new PulseRateLimitError(retryAfter, rateLimit)
    }

    throw new PulseApiError(status, errorCode, message, rateLimit)
  }
}
