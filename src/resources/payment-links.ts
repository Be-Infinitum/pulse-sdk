import type { HttpClient } from '../client'
import type {
  CreatePaymentLinkParams,
  ListPaymentLinksParams,
  PaymentIntent,
  PaymentLink,
} from '../types'

/**
 * Resource for managing payment links.
 * Access via `pulse.paymentLinks`.
 *
 * @example
 * ```typescript
 * const pulse = new Pulse('sk_live_...')
 *
 * // Create a payment link
 * const link = await pulse.paymentLinks.create({
 *   title: 'Order #42',
 *   amount: '100.00',
 * })
 *
 * // List all links
 * const links = await pulse.paymentLinks.list({ limit: 10 })
 * ```
 */
export class PaymentLinksResource {
  constructor(private readonly client: HttpClient) {}

  /**
   * Create a new payment link.
   *
   * @param params - Payment link parameters (title, amount, optional currency and description).
   * @returns The created payment link object.
   * @throws {PulseAuthenticationError} If the API key is invalid.
   * @throws {PulseApiError} If validation fails (e.g. invalid currency).
   *
   * @example
   * ```typescript
   * const link = await pulse.paymentLinks.create({
   *   title: 'Web Development',
   *   amount: '150.00',
   *   currency: 'USD',
   *   description: 'Landing page development',
   * })
   * console.log(link.id, link.slug)
   * ```
   */
  async create(params: CreatePaymentLinkParams): Promise<PaymentLink> {
    return this.client.request<PaymentLink>('POST', '/payment-links', {
      body: params,
    })
  }

  /**
   * List payment links for the authenticated user.
   *
   * @param params - Optional pagination parameters (limit, offset).
   * @returns Array of payment link objects.
   * @throws {PulseAuthenticationError} If the API key is invalid.
   *
   * @example
   * ```typescript
   * const links = await pulse.paymentLinks.list({ limit: 10, offset: 0 })
   * for (const link of links) {
   *   console.log(link.title, link.amount, link.status)
   * }
   * ```
   */
  async list(params?: ListPaymentLinksParams): Promise<PaymentLink[]> {
    return this.client.request<PaymentLink[]>('GET', '/payment-links', {
      query: {
        limit: params?.limit,
        offset: params?.offset,
      },
    })
  }

  /**
   * Get a single payment link by ID.
   *
   * @param linkId - The payment link UUID.
   * @returns The payment link object.
   * @throws {PulseAuthenticationError} If the API key is invalid.
   * @throws {PulseApiError} With status 404 if the link doesn't exist.
   *
   * @example
   * ```typescript
   * const link = await pulse.paymentLinks.get('abc-123-def')
   * console.log(link.title, link.amount)
   * ```
   */
  async get(linkId: string): Promise<PaymentLink> {
    return this.client.request<PaymentLink>('GET', `/payment-links/${linkId}`)
  }

  /**
   * List payment intents (payment attempts) for a specific payment link.
   *
   * @param linkId - The payment link UUID.
   * @returns Array of payment intent objects.
   * @throws {PulseAuthenticationError} If the API key is invalid.
   *
   * @example
   * ```typescript
   * const intents = await pulse.paymentLinks.listIntents('abc-123-def')
   * const confirmed = intents.filter(i => i.status === 'confirmed')
   * console.log(`${confirmed.length} confirmed payments`)
   * ```
   */
  async listIntents(linkId: string): Promise<PaymentIntent[]> {
    return this.client.request<PaymentIntent[]>(
      'GET',
      `/payment-links/${linkId}/intents`
    )
  }
}
