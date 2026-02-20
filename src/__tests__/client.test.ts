import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HttpClient } from '../client'
import {
  PulseError,
  PulseApiError,
  PulseAuthenticationError,
  PulseRateLimitError,
} from '../errors'

function mockFetch(body: unknown, init?: { status?: number; headers?: Record<string, string> }) {
  const status = init?.status ?? 200
  const headers = new Headers(init?.headers ?? {})
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers,
    json: vi.fn().mockResolvedValue(body),
  } as any)
}

describe('HttpClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('constructor', () => {
    it('throws PulseError for invalid API key', () => {
      expect(() => new HttpClient('invalid_key')).toThrow(PulseError)
      expect(() => new HttpClient('invalid_key')).toThrow(
        'Invalid API key format. Keys must start with "sk_live_"'
      )
    })

    it('accepts valid sk_live_ key', () => {
      expect(() => new HttpClient('sk_live_test123')).not.toThrow()
    })

    it('normalizes baseUrl trailing slashes', async () => {
      const client = new HttpClient('sk_live_test', 'https://custom.api.com///')
      const fetch = mockFetch({ data: 'ok' })
      vi.stubGlobal('fetch', fetch)

      await client.request('GET', '/test')

      expect(fetch).toHaveBeenCalledWith(
        'https://custom.api.com/api/v1/test',
        expect.anything()
      )
    })

    it('uses default baseUrl when not provided', async () => {
      const client = new HttpClient('sk_live_test')
      const fetch = mockFetch({ data: 'ok' })
      vi.stubGlobal('fetch', fetch)

      await client.request('GET', '/test')

      expect(fetch).toHaveBeenCalledWith(
        'https://api.beinfi.com/api/v1/test',
        expect.anything()
      )
    })
  })

  describe('request', () => {
    it('sends GET request with correct headers', async () => {
      const client = new HttpClient('sk_live_abc123')
      const fetch = mockFetch({ data: [] })
      vi.stubGlobal('fetch', fetch)

      await client.request('GET', '/items')

      expect(fetch).toHaveBeenCalledWith(
        'https://api.beinfi.com/api/v1/items',
        {
          method: 'GET',
          headers: {
            Authorization: 'Bearer sk_live_abc123',
            'Content-Type': 'application/json',
          },
          body: undefined,
        }
      )
    })

    it('sends POST request with JSON body', async () => {
      const client = new HttpClient('sk_live_abc123')
      const fetch = mockFetch({ data: { id: '1' } })
      vi.stubGlobal('fetch', fetch)

      await client.request('POST', '/items', { body: { name: 'Test' } })

      expect(fetch).toHaveBeenCalledWith(
        'https://api.beinfi.com/api/v1/items',
        {
          method: 'POST',
          headers: {
            Authorization: 'Bearer sk_live_abc123',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: 'Test' }),
        }
      )
    })

    it('sends DELETE request', async () => {
      const client = new HttpClient('sk_live_abc123')
      const fetch = mockFetch(null, { status: 204 })
      vi.stubGlobal('fetch', fetch)

      await client.request('DELETE', '/items/123')

      expect(fetch).toHaveBeenCalledWith(
        'https://api.beinfi.com/api/v1/items/123',
        expect.objectContaining({ method: 'DELETE' })
      )
    })

    it('appends query params filtering undefined values', async () => {
      const client = new HttpClient('sk_live_abc123')
      const fetch = mockFetch({ data: [] })
      vi.stubGlobal('fetch', fetch)

      await client.request('GET', '/items', {
        query: { limit: 10, offset: undefined, status: 'active' },
      })

      const calledUrl = fetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('limit=10')
      expect(calledUrl).toContain('status=active')
      expect(calledUrl).not.toContain('offset')
    })

    it('does not append query string when all values are undefined', async () => {
      const client = new HttpClient('sk_live_abc123')
      const fetch = mockFetch({ data: [] })
      vi.stubGlobal('fetch', fetch)

      await client.request('GET', '/items', {
        query: { limit: undefined, offset: undefined },
      })

      const calledUrl = fetch.mock.calls[0][0] as string
      expect(calledUrl).toBe('https://api.beinfi.com/api/v1/items')
    })

    it('unwraps { data } envelope', async () => {
      const client = new HttpClient('sk_live_abc123')
      vi.stubGlobal('fetch', mockFetch({ data: [{ id: '1' }] }))

      const result = await client.request('GET', '/items')
      expect(result).toEqual([{ id: '1' }])
    })

    it('returns raw JSON when no data envelope', async () => {
      const client = new HttpClient('sk_live_abc123')
      vi.stubGlobal('fetch', mockFetch({ accepted: 2, failed: 0 }))

      const result = await client.request('GET', '/items')
      expect(result).toEqual({ accepted: 2, failed: 0 })
    })

    it('returns undefined for 204 No Content', async () => {
      const client = new HttpClient('sk_live_abc123')
      vi.stubGlobal('fetch', mockFetch(null, { status: 204 }))

      const result = await client.request('DELETE', '/items/1')
      expect(result).toBeUndefined()
    })

    it('parses rate limit headers', async () => {
      const client = new HttpClient('sk_live_abc123')
      const fetch = mockFetch(
        { error: 'rate_limit_exceeded', message: 'Too many' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '100',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': '9999999999',
          },
        }
      )
      vi.stubGlobal('fetch', fetch)

      try {
        await client.request('GET', '/items')
      } catch (err) {
        expect(err).toBeInstanceOf(PulseRateLimitError)
        const rle = err as PulseRateLimitError
        expect(rle.rateLimit).toEqual({
          limit: 100,
          remaining: 0,
          reset: 9999999999,
        })
      }
    })
  })

  describe('error mapping', () => {
    it('throws PulseAuthenticationError on 401', async () => {
      const client = new HttpClient('sk_live_abc123')
      vi.stubGlobal(
        'fetch',
        mockFetch({ error: 'unauthorized', message: 'Invalid API key' }, { status: 401 })
      )

      await expect(client.request('GET', '/items')).rejects.toThrow(PulseAuthenticationError)
    })

    it('throws PulseRateLimitError on 429', async () => {
      const client = new HttpClient('sk_live_abc123')
      vi.stubGlobal(
        'fetch',
        mockFetch(
          { error: 'rate_limit_exceeded', message: 'Too many requests' },
          { status: 429 }
        )
      )

      await expect(client.request('GET', '/items')).rejects.toThrow(PulseRateLimitError)
    })

    it('throws PulseRateLimitError with default retryAfter 60 when no rate limit headers', async () => {
      const client = new HttpClient('sk_live_abc123')
      vi.stubGlobal(
        'fetch',
        mockFetch(
          { error: 'rate_limit_exceeded', message: 'Too many' },
          { status: 429 }
        )
      )

      try {
        await client.request('GET', '/items')
      } catch (err) {
        expect(err).toBeInstanceOf(PulseRateLimitError)
        expect((err as PulseRateLimitError).retryAfter).toBe(60)
      }
    })

    it('throws PulseApiError on other 4xx/5xx', async () => {
      const client = new HttpClient('sk_live_abc123')
      vi.stubGlobal(
        'fetch',
        mockFetch({ error: 'not_found', message: 'Not found' }, { status: 404 })
      )

      await expect(client.request('GET', '/items/bad')).rejects.toThrow(PulseApiError)
      try {
        await client.request('GET', '/items/bad')
      } catch (err) {
        const apiErr = err as PulseApiError
        expect(apiErr.status).toBe(404)
        expect(apiErr.errorCode).toBe('not_found')
      }
    })

    it('handles non-JSON error response gracefully', async () => {
      const client = new HttpClient('sk_live_abc123')
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          headers: new Headers(),
          json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
        } as any)
      )

      try {
        await client.request('GET', '/items')
      } catch (err) {
        expect(err).toBeInstanceOf(PulseApiError)
        const apiErr = err as PulseApiError
        expect(apiErr.status).toBe(500)
        expect(apiErr.errorCode).toBe('unknown_error')
        expect(apiErr.message).toBe('Request failed with status 500')
      }
    })

    it('uses fallback message when body has no message', async () => {
      const client = new HttpClient('sk_live_abc123')
      vi.stubGlobal(
        'fetch',
        mockFetch({ error: 'server_error' }, { status: 503 })
      )

      try {
        await client.request('GET', '/items')
      } catch (err) {
        expect(err).toBeInstanceOf(PulseApiError)
        expect((err as PulseApiError).message).toBe('Request failed with status 503')
      }
    })
  })
})
