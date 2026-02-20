import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HttpClient } from '../client'
import { PaymentLinksResource } from '../resources/payment-links'
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

const SAMPLE_LINK = {
  id: 'link-1',
  title: 'Order #42',
  description: null,
  amount: '100.00',
  currency: 'USD',
  status: 'active',
  slug: 'order-42',
  userId: 'user-1',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

describe('PaymentLinksResource', () => {
  let resource: PaymentLinksResource

  beforeEach(() => {
    vi.restoreAllMocks()
    const client = new HttpClient('sk_live_test')
    resource = new PaymentLinksResource(client)
  })

  describe('create', () => {
    it('creates a payment link with minimal params', async () => {
      const fetch = mockFetch({ data: SAMPLE_LINK })
      vi.stubGlobal('fetch', fetch)

      const result = await resource.create({ title: 'Order #42', amount: '100.00' })

      expect(result).toEqual(SAMPLE_LINK)
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/payment-links'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ title: 'Order #42', amount: '100.00' }),
        })
      )
    })

    it('creates a payment link with all optional params', async () => {
      vi.stubGlobal('fetch', mockFetch({ data: SAMPLE_LINK }))

      const result = await resource.create({
        title: 'Order #42',
        amount: '100.00',
        currency: 'BRL',
        description: 'Landing page dev',
      })

      expect(result).toEqual(SAMPLE_LINK)
    })
  })

  describe('list', () => {
    it('lists payment links without params', async () => {
      const fetch = mockFetch({ data: [SAMPLE_LINK] })
      vi.stubGlobal('fetch', fetch)

      const result = await resource.list()

      expect(result).toEqual([SAMPLE_LINK])
      const url = fetch.mock.calls[0][0] as string
      expect(url).not.toContain('?')
    })

    it('lists payment links with limit and offset', async () => {
      const fetch = mockFetch({ data: [SAMPLE_LINK] })
      vi.stubGlobal('fetch', fetch)

      await resource.list({ limit: 5, offset: 10 })

      const url = fetch.mock.calls[0][0] as string
      expect(url).toContain('limit=5')
      expect(url).toContain('offset=10')
    })
  })

  describe('get', () => {
    it('returns a single payment link', async () => {
      vi.stubGlobal('fetch', mockFetch({ data: SAMPLE_LINK }))

      const result = await resource.get('link-1')
      expect(result).toEqual(SAMPLE_LINK)
    })

    it('throws PulseApiError on 404', async () => {
      vi.stubGlobal(
        'fetch',
        mockFetch({ error: 'not_found', message: 'Not found' }, { status: 404 })
      )

      await expect(resource.get('nonexistent')).rejects.toThrow(PulseApiError)
    })
  })

  describe('listIntents', () => {
    it('returns array of payment intents', async () => {
      const intents = [
        {
          id: 'intent-1',
          paymentLinkId: 'link-1',
          amount: '100.00',
          currency: 'USD',
          status: 'confirmed',
          method: 'crypto',
          txHash: '0xabc',
          confirmedAt: '2024-01-01T00:00:00Z',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ]
      vi.stubGlobal('fetch', mockFetch({ data: intents }))

      const result = await resource.listIntents('link-1')
      expect(result).toEqual(intents)
    })

    it('calls correct endpoint', async () => {
      const fetch = mockFetch({ data: [] })
      vi.stubGlobal('fetch', fetch)

      await resource.listIntents('link-1')

      const url = fetch.mock.calls[0][0] as string
      expect(url).toContain('/payment-links/link-1/intents')
    })
  })
})
