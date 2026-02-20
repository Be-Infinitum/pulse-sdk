import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HttpClient } from '../client'
import { WebhooksResource } from '../resources/webhooks'
import { PulseApiError } from '../errors'

function mockFetch(body: unknown, init?: { status?: number }) {
  const status = init?.status ?? 200
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    json: vi.fn().mockResolvedValue(body),
  } as any)
}

const SAMPLE_WEBHOOK = {
  id: 'wh-1',
  url: 'https://example.com/webhook',
  events: ['payment.confirmed'],
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
}

describe('WebhooksResource', () => {
  let resource: WebhooksResource

  beforeEach(() => {
    vi.restoreAllMocks()
    const client = new HttpClient('sk_live_test')
    resource = new WebhooksResource(client)
  })

  describe('create', () => {
    it('creates a webhook with events', async () => {
      const created = { ...SAMPLE_WEBHOOK, secret: 'a'.repeat(64) }
      const fetch = mockFetch({ data: created })
      vi.stubGlobal('fetch', fetch)

      const result = await resource.create({
        url: 'https://example.com/webhook',
        events: ['payment.confirmed'],
      })

      expect(result).toEqual(created)
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/webhooks'),
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('returns a secret in the response', async () => {
      const secret = 'b'.repeat(64)
      vi.stubGlobal('fetch', mockFetch({ data: { ...SAMPLE_WEBHOOK, secret } }))

      const result = await resource.create({
        url: 'https://example.com/hook',
        events: ['payment.confirmed'],
      })

      expect(result.secret).toBe(secret)
      expect(result.secret).toHaveLength(64)
    })
  })

  describe('list', () => {
    it('returns array of webhooks', async () => {
      vi.stubGlobal('fetch', mockFetch({ data: [SAMPLE_WEBHOOK] }))

      const result = await resource.list()
      expect(result).toEqual([SAMPLE_WEBHOOK])
    })

    it('returns empty array when no webhooks exist', async () => {
      vi.stubGlobal('fetch', mockFetch({ data: [] }))

      const result = await resource.list()
      expect(result).toEqual([])
    })

    it('calls correct endpoint with GET', async () => {
      const fetch = mockFetch({ data: [] })
      vi.stubGlobal('fetch', fetch)

      await resource.list()

      const url = fetch.mock.calls[0][0] as string
      expect(url).toContain('/webhooks')
      expect(fetch.mock.calls[0][1].method).toBe('GET')
    })
  })

  describe('delete', () => {
    it('deletes a webhook successfully', async () => {
      const fetch = mockFetch(null, { status: 204 })
      vi.stubGlobal('fetch', fetch)

      const result = await resource.delete('wh-1')

      expect(result).toBeUndefined()
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/webhooks/wh-1'),
        expect.objectContaining({ method: 'DELETE' })
      )
    })

    it('throws PulseApiError on 404', async () => {
      vi.stubGlobal(
        'fetch',
        mockFetch({ error: 'not_found', message: 'Webhook not found' }, { status: 404 })
      )

      await expect(resource.delete('nonexistent')).rejects.toThrow(PulseApiError)
    })
  })
})
