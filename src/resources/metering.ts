import type { HttpClient } from '../client'
import type {
  TrackEventParams,
  TrackEventResponse,
  BatchTrackResponse,
  UsageQuery,
  UsageResponse,
  CreateCustomerParams,
  MeteringProduct,
  ProductCustomer,
} from '../types'

function generateId(): string {
  const hex = '0123456789abcdef'
  let id = ''
  for (let i = 0; i < 32; i++) {
    id += hex[Math.floor(Math.random() * 16)]
    if (i === 7 || i === 11 || i === 15 || i === 19) id += '-'
  }
  return id
}

/**
 * Resource for usage-based metering and billing.
 * Access via `pulse.metering`.
 *
 * @example
 * ```typescript
 * const pulse = new Pulse('sk_live_...')
 *
 * // Track a usage event
 * await pulse.metering.track({
 *   meterId: 'meter_id',
 *   customerId: 'user_123',
 *   value: 1500,
 * })
 *
 * // Query aggregated usage
 * const usage = await pulse.metering.getUsage({ customerId: 'user_123' })
 * ```
 */
export class MeteringResource {
  constructor(private readonly client: HttpClient) {}

  /**
   * Track a single usage event.
   *
   * @param params - Event parameters (meterId, customerId, value).
   * @returns The created event object.
   *
   * @example
   * ```typescript
   * await pulse.metering.track({
   *   meterId: 'tokens',
   *   customerId: 'user_123',
   *   value: 1500,
   *   metadata: { model: 'gpt-4' }
   * })
   * ```
   */
  async track(params: TrackEventParams): Promise<TrackEventResponse> {
    return this.client.request<TrackEventResponse>(
      'POST',
      '/metering/events',
      {
        body: {
          eventId: params.eventId || generateId(),
          meterId: params.meterId,
          customerId: params.customerId,
          value:
            typeof params.value === 'number'
              ? String(params.value)
              : params.value,
          timestamp: params.timestamp?.toISOString(),
          metadata: params.metadata,
        },
      }
    )
  }

  /**
   * Track multiple usage events in a single request.
   *
   * @param events - Array of event parameters.
   * @returns Batch result with accepted/failed counts.
   *
   * @example
   * ```typescript
   * await pulse.metering.trackBatch([
   *   { meterId: 'tokens', customerId: 'user_1', value: 500 },
   *   { meterId: 'tokens', customerId: 'user_2', value: 1200 },
   * ])
   * ```
   */
  async trackBatch(events: TrackEventParams[]): Promise<BatchTrackResponse> {
    return this.client.request<BatchTrackResponse>(
      'POST',
      '/metering/events/batch',
      {
        body: {
          events: events.map((e) => ({
            eventId: e.eventId || generateId(),
            meterId: e.meterId,
            customerId: e.customerId,
            value: typeof e.value === 'number' ? String(e.value) : e.value,
            timestamp: e.timestamp?.toISOString(),
            metadata: e.metadata,
          })),
        },
      }
    )
  }

  /**
   * Query aggregated usage data.
   *
   * @param query - Optional filters (customerId, date range).
   * @returns Aggregated usage by meter.
   *
   * @example
   * ```typescript
   * const usage = await pulse.metering.getUsage({ customerId: 'user_123' })
   * for (const item of usage.data) {
   *   console.log(item.meterName, item.totalValue, item.totalAmount)
   * }
   * ```
   */
  async getUsage(query?: UsageQuery): Promise<UsageResponse> {
    return this.client.request<UsageResponse>('GET', '/metering/usage', {
      query: {
        customerId: query?.customerId,
        startDate: query?.startDate,
        endDate: query?.endDate,
      },
    })
  }

  /**
   * List all products.
   *
   * @returns Array of product objects with meters.
   */
  async listProducts(): Promise<MeteringProduct[]> {
    return this.client.request<MeteringProduct[]>('GET', '/metering/products')
  }

  /**
   * Create a customer for a product.
   *
   * @param productId - The product UUID.
   * @param data - Customer data (externalId, name, email, metadata).
   * @returns The created customer object.
   *
   * @example
   * ```typescript
   * const customer = await pulse.metering.createCustomer('product-id', {
   *   externalId: 'user_123',
   *   name: 'John Doe',
   *   email: 'john@example.com',
   * })
   * ```
   */
  async createCustomer(
    productId: string,
    data: CreateCustomerParams
  ): Promise<ProductCustomer> {
    return this.client.request<ProductCustomer>(
      'POST',
      `/metering/products/${productId}/customers`,
      { body: data }
    )
  }

  /**
   * Get customer usage for a specific product.
   *
   * @param productId - The product UUID.
   * @param customerId - The customer external ID.
   * @param query - Optional date range filters.
   * @returns Aggregated usage by meter for the customer.
   */
  async getCustomerUsage(
    productId: string,
    customerId: string,
    query?: { startDate?: string; endDate?: string }
  ): Promise<UsageResponse> {
    return this.client.request<UsageResponse>(
      'GET',
      `/metering/products/${productId}/customers/${customerId}/usage`,
      {
        query: {
          startDate: query?.startDate,
          endDate: query?.endDate,
        },
      }
    )
  }

  /**
   * Create a session for tracking multiple events for a customer.
   * Events are accumulated and sent as a batch when `.end()` is called.
   *
   * @param customerId - The customer external ID.
   * @returns A session instance.
   *
   * @example
   * ```typescript
   * const session = pulse.metering.session('user_123')
   * session.track('tokens', 500)
   * session.track('tokens', 300)
   * session.track('requests', 1)
   * await session.end() // sends batch: tokens=800, requests=1
   * ```
   */
  session(customerId: string): MeteringSession {
    return new MeteringSession(this, customerId)
  }
}

/**
 * A session accumulates track calls and sends them as a batch.
 */
class MeteringSession {
  private events: TrackEventParams[] = []

  constructor(
    private readonly metering: MeteringResource,
    private readonly customerId: string
  ) {}

  /**
   * Queue a tracking event in this session.
   */
  track(
    meterId: string,
    value: number | string,
    metadata?: Record<string, unknown>
  ): this {
    this.events.push({
      meterId,
      customerId: this.customerId,
      value,
      metadata,
    })
    return this
  }

  /**
   * Send all accumulated events as a batch and clear the session.
   */
  async end(): Promise<BatchTrackResponse> {
    if (this.events.length === 0) {
      return { accepted: 0, failed: 0, results: [] }
    }
    const result = await this.metering.trackBatch(this.events)
    this.events = []
    return result
  }
}
