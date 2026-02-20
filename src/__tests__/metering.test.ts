import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HttpClient } from '../client'
import { MeteringResource } from '../resources/metering'

function mockFetch(body: unknown, init?: { status?: number }) {
  const status = init?.status ?? 200
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    json: vi.fn().mockResolvedValue(body),
  } as any)
}

const SAMPLE_EVENT = {
  id: 'evt-1',
  eventId: 'custom-id',
  meterId: 'tokens',
  customerId: 'user_123',
  value: '1500',
  timestamp: '2024-01-01T00:00:00.000Z',
  createdAt: '2024-01-01T00:00:00.000Z',
}

describe('MeteringResource', () => {
  let resource: MeteringResource

  beforeEach(() => {
    vi.restoreAllMocks()
    const client = new HttpClient('sk_live_test')
    resource = new MeteringResource(client)
  })

  describe('track', () => {
    it('tracks event with provided eventId', async () => {
      const fetch = mockFetch({ data: SAMPLE_EVENT })
      vi.stubGlobal('fetch', fetch)

      await resource.track({
        eventId: 'custom-id',
        meterId: 'tokens',
        customerId: 'user_123',
        value: 1500,
      })

      const body = JSON.parse(fetch.mock.calls[0][1].body)
      expect(body.eventId).toBe('custom-id')
    })

    it('auto-generates eventId when not provided', async () => {
      const fetch = mockFetch({ data: SAMPLE_EVENT })
      vi.stubGlobal('fetch', fetch)

      await resource.track({
        meterId: 'tokens',
        customerId: 'user_123',
        value: 1500,
      })

      const body = JSON.parse(fetch.mock.calls[0][1].body)
      expect(body.eventId).toBeDefined()
      expect(body.eventId.length).toBeGreaterThan(0)
    })

    it('converts numeric value to string', async () => {
      const fetch = mockFetch({ data: SAMPLE_EVENT })
      vi.stubGlobal('fetch', fetch)

      await resource.track({
        meterId: 'tokens',
        customerId: 'user_123',
        value: 1500,
      })

      const body = JSON.parse(fetch.mock.calls[0][1].body)
      expect(body.value).toBe('1500')
    })

    it('keeps string value as-is', async () => {
      const fetch = mockFetch({ data: SAMPLE_EVENT })
      vi.stubGlobal('fetch', fetch)

      await resource.track({
        meterId: 'tokens',
        customerId: 'user_123',
        value: '2000',
      })

      const body = JSON.parse(fetch.mock.calls[0][1].body)
      expect(body.value).toBe('2000')
    })

    it('converts Date timestamp to ISO string', async () => {
      const fetch = mockFetch({ data: SAMPLE_EVENT })
      vi.stubGlobal('fetch', fetch)

      const date = new Date('2024-06-15T10:30:00Z')
      await resource.track({
        meterId: 'tokens',
        customerId: 'user_123',
        value: 100,
        timestamp: date,
      })

      const body = JSON.parse(fetch.mock.calls[0][1].body)
      expect(body.timestamp).toBe('2024-06-15T10:30:00.000Z')
    })

    it('omits timestamp when not provided', async () => {
      const fetch = mockFetch({ data: SAMPLE_EVENT })
      vi.stubGlobal('fetch', fetch)

      await resource.track({
        meterId: 'tokens',
        customerId: 'user_123',
        value: 100,
      })

      const body = JSON.parse(fetch.mock.calls[0][1].body)
      expect(body.timestamp).toBeUndefined()
    })

    it('includes metadata when provided', async () => {
      const fetch = mockFetch({ data: SAMPLE_EVENT })
      vi.stubGlobal('fetch', fetch)

      await resource.track({
        meterId: 'tokens',
        customerId: 'user_123',
        value: 100,
        metadata: { model: 'gpt-4' },
      })

      const body = JSON.parse(fetch.mock.calls[0][1].body)
      expect(body.metadata).toEqual({ model: 'gpt-4' })
    })
  })

  describe('trackBatch', () => {
    it('sends multiple events in a batch', async () => {
      const batchResponse = { accepted: 2, failed: 0, results: [] }
      const fetch = mockFetch(batchResponse)
      vi.stubGlobal('fetch', fetch)

      await resource.trackBatch([
        { meterId: 'tokens', customerId: 'user_1', value: 500 },
        { meterId: 'tokens', customerId: 'user_2', value: 1200 },
      ])

      const body = JSON.parse(fetch.mock.calls[0][1].body)
      expect(body.events).toHaveLength(2)
      expect(body.events[0].value).toBe('500')
      expect(body.events[1].value).toBe('1200')
    })

    it('sends empty batch', async () => {
      const batchResponse = { accepted: 0, failed: 0, results: [] }
      const fetch = mockFetch(batchResponse)
      vi.stubGlobal('fetch', fetch)

      await resource.trackBatch([])

      const body = JSON.parse(fetch.mock.calls[0][1].body)
      expect(body.events).toEqual([])
    })

    it('auto-generates eventId for each event', async () => {
      const fetch = mockFetch({ accepted: 1, failed: 0, results: [] })
      vi.stubGlobal('fetch', fetch)

      await resource.trackBatch([
        { meterId: 'tokens', customerId: 'user_1', value: 100 },
      ])

      const body = JSON.parse(fetch.mock.calls[0][1].body)
      expect(body.events[0].eventId).toBeDefined()
    })

    it('calls correct endpoint', async () => {
      const fetch = mockFetch({ accepted: 0, failed: 0, results: [] })
      vi.stubGlobal('fetch', fetch)

      await resource.trackBatch([])

      const url = fetch.mock.calls[0][0] as string
      expect(url).toContain('/metering/events/batch')
    })
  })

  describe('getUsage', () => {
    it('gets usage without filters', async () => {
      const usage = { data: [{ meterId: 'm1', totalValue: '100' }] }
      const fetch = mockFetch(usage)
      vi.stubGlobal('fetch', fetch)

      const result = await resource.getUsage()

      // getUsage returns UsageResponse which itself has .data — but HttpClient unwraps envelope
      // Actually UsageResponse = { data: UsageItem[] }, and the API returns { data: UsageResponse }
      // HttpClient unwraps the outer envelope, so result = UsageResponse = { data: [...] }
      expect(result).toEqual(usage)
    })

    it('gets usage with filters', async () => {
      const fetch = mockFetch({ data: [] })
      vi.stubGlobal('fetch', fetch)

      await resource.getUsage({
        customerId: 'user_123',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      })

      const url = fetch.mock.calls[0][0] as string
      expect(url).toContain('customerId=user_123')
      expect(url).toContain('startDate=2024-01-01')
      expect(url).toContain('endDate=2024-12-31')
    })
  })

  describe('listProducts', () => {
    it('returns array of products', async () => {
      const products = [{ id: 'p1', name: 'AI', status: 'active', meters: [] }]
      vi.stubGlobal('fetch', mockFetch({ data: products }))

      const result = await resource.listProducts()
      expect(result).toEqual(products)
    })
  })

  describe('createProduct', () => {
    it('creates product with name only', async () => {
      const product = { id: 'p1', name: 'AI Agent', status: 'active', meters: [] }
      const fetch = mockFetch({ data: product })
      vi.stubGlobal('fetch', fetch)

      const result = await resource.createProduct({ name: 'AI Agent' })

      expect(result).toEqual(product)
      const body = JSON.parse(fetch.mock.calls[0][1].body)
      expect(body.name).toBe('AI Agent')
    })

    it('creates product with description', async () => {
      const fetch = mockFetch({ data: { id: 'p1', name: 'AI', description: 'desc', status: 'active', meters: [] } })
      vi.stubGlobal('fetch', fetch)

      await resource.createProduct({ name: 'AI', description: 'desc' })

      const body = JSON.parse(fetch.mock.calls[0][1].body)
      expect(body.description).toBe('desc')
    })
  })

  describe('createMeter', () => {
    it('creates a meter on a product', async () => {
      const meter = { id: 'm1', name: 'tokens', displayName: 'AI Tokens', unit: 'token', unitPrice: '0.0001', status: 'active' }
      const fetch = mockFetch({ data: meter })
      vi.stubGlobal('fetch', fetch)

      const result = await resource.createMeter('prod-1', {
        name: 'tokens',
        displayName: 'AI Tokens',
        unit: 'token',
        unitPrice: '0.0001',
      })

      expect(result).toEqual(meter)
      const url = fetch.mock.calls[0][0] as string
      expect(url).toContain('/metering/products/prod-1/meters')
    })
  })

  describe('createCustomer', () => {
    it('creates customer with required fields', async () => {
      const customer = { id: 'c1', externalId: 'user_123', createdAt: '2024-01-01T00:00:00Z' }
      const fetch = mockFetch({ data: customer })
      vi.stubGlobal('fetch', fetch)

      const result = await resource.createCustomer('prod-1', { externalId: 'user_123' })

      expect(result).toEqual(customer)
    })

    it('creates customer with optional fields', async () => {
      const fetch = mockFetch({ data: { id: 'c1', externalId: 'user_123', name: 'John', email: 'j@e.com', createdAt: '2024-01-01' } })
      vi.stubGlobal('fetch', fetch)

      await resource.createCustomer('prod-1', {
        externalId: 'user_123',
        name: 'John',
        email: 'j@e.com',
        metadata: { plan: 'pro' },
      })

      const body = JSON.parse(fetch.mock.calls[0][1].body)
      expect(body.name).toBe('John')
      expect(body.email).toBe('j@e.com')
      expect(body.metadata).toEqual({ plan: 'pro' })
    })
  })

  describe('getCustomerUsage', () => {
    it('gets customer usage for a product', async () => {
      const usage = { data: [] }
      const fetch = mockFetch(usage)
      vi.stubGlobal('fetch', fetch)

      await resource.getCustomerUsage('prod-1', 'user_123')

      const url = fetch.mock.calls[0][0] as string
      expect(url).toContain('/metering/products/prod-1/customers/user_123/usage')
    })

    it('passes date filters', async () => {
      const fetch = mockFetch({ data: [] })
      vi.stubGlobal('fetch', fetch)

      await resource.getCustomerUsage('prod-1', 'user_123', {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      })

      const url = fetch.mock.calls[0][0] as string
      expect(url).toContain('startDate=2024-01-01')
      expect(url).toContain('endDate=2024-12-31')
    })
  })

  describe('session', () => {
    it('returns a session with chaining', () => {
      const session = resource.session('user_123')
      const result = session.track('tokens', 500)
      expect(result).toBe(session) // chaining
    })

    it('accumulates and sends events on end()', async () => {
      const batchResponse = { accepted: 2, failed: 0, results: [] }
      const fetch = mockFetch(batchResponse)
      vi.stubGlobal('fetch', fetch)

      const session = resource.session('user_123')
      session.track('tokens', 500)
      session.track('requests', 1)
      const result = await session.end()

      expect(result).toEqual(batchResponse)
      const body = JSON.parse(fetch.mock.calls[0][1].body)
      expect(body.events).toHaveLength(2)
      expect(body.events[0].meterId).toBe('tokens')
      expect(body.events[0].customerId).toBe('user_123')
      expect(body.events[1].meterId).toBe('requests')
    })

    it('returns empty result for empty session', async () => {
      const session = resource.session('user_123')
      const result = await session.end()

      expect(result).toEqual({ accepted: 0, failed: 0, results: [] })
    })

    it('clears events after end()', async () => {
      const fetch = mockFetch({ accepted: 1, failed: 0, results: [] })
      vi.stubGlobal('fetch', fetch)

      const session = resource.session('user_123')
      session.track('tokens', 100)
      await session.end()

      // Second end should return empty
      const result = await session.end()
      expect(result).toEqual({ accepted: 0, failed: 0, results: [] })
    })
  })
})
