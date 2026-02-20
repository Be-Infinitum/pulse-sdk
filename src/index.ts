import { HttpClient } from './client'
import { PaymentLinksResource } from './resources/payment-links'
import { WebhooksResource } from './resources/webhooks'
import { MeteringResource } from './resources/metering'
import { verifyWebhookSignature } from './webhooks/verify'
import { mountCheckout } from './checkout/checkout'
import type { PulseConfig } from './types'

/**
 * Main entry point for the Pulse SDK.
 * Create an instance with your API key to access payment links and webhooks.
 *
 * @example
 * ```typescript
 * import { Pulse } from '@beinfi/pulse-sdk'
 *
 * // Quick setup with just an API key
 * const pulse = new Pulse('sk_live_...')
 *
 * // Or with full config
 * const pulse = new Pulse({
 *   apiKey: 'sk_live_...',
 *   baseUrl: 'https://api.beinfi.com',
 * })
 *
 * // Create a payment link
 * const link = await pulse.paymentLinks.create({
 *   title: 'Order #42',
 *   amount: '100.00',
 * })
 *
 * // Verify webhook signatures (static method, no instance needed)
 * const isValid = Pulse.webhooks.verifySignature(rawBody, signature, secret)
 *
 * // Mount checkout widget (static method, browser only)
 * const checkout = Pulse.checkout.mount('#container', { linkId: link.id })
 * ```
 */
export class Pulse {
  /** Resource for creating, listing, and fetching payment links. */
  public readonly paymentLinks: PaymentLinksResource
  /** Resource for creating, listing, and deleting webhook subscriptions. */
  public readonly webhooks: WebhooksResource
  /** Resource for usage-based metering, tracking events, and querying usage. */
  public readonly metering: MeteringResource

  private readonly client: HttpClient

  /**
   * Static utilities for verifying webhook signatures.
   * Does not require a Pulse instance — useful in webhook handler endpoints.
   *
   * @example
   * ```typescript
   * const isValid = Pulse.webhooks.verifySignature(
   *   rawBody,
   *   req.headers['x-pulse-signature'],
   *   process.env.PULSE_WEBHOOK_SECRET
   * )
   * ```
   */
  static webhooks = {
    verifySignature: verifyWebhookSignature,
  }

  /**
   * Static utilities for mounting the checkout widget.
   * Browser-only — embeds an iframe-based checkout for a payment link.
   *
   * @example
   * ```typescript
   * const instance = Pulse.checkout.mount('#checkout', {
   *   linkId: 'abc-123',
   *   onSuccess: (payment) => console.log('Paid!', payment),
   * })
   * ```
   */
  static checkout = {
    mount: mountCheckout,
  }

  /**
   * Create a new Pulse SDK client.
   *
   * @param config - Either an API key string (`"sk_live_..."`) or a {@link PulseConfig} object.
   * @throws {PulseError} If the API key doesn't start with `"sk_live_"`.
   *
   * @example
   * ```typescript
   * // String shorthand
   * const pulse = new Pulse('sk_live_...')
   *
   * // Config object
   * const pulse = new Pulse({ apiKey: 'sk_live_...', baseUrl: 'https://api.beinfi.com' })
   * ```
   */
  constructor(config: string | PulseConfig) {
    const apiKey = typeof config === 'string' ? config : config.apiKey
    const baseUrl = typeof config === 'string' ? undefined : config.baseUrl

    this.client = new HttpClient(apiKey, baseUrl)
    this.paymentLinks = new PaymentLinksResource(this.client)
    this.webhooks = new WebhooksResource(this.client)
    this.metering = new MeteringResource(this.client)
  }
}

export { verifyWebhookSignature } from './webhooks/verify'

export {
  PulseError,
  PulseApiError,
  PulseAuthenticationError,
  PulseRateLimitError,
} from './errors'

export type {
  PulseConfig,
  CreatePaymentLinkParams,
  PaymentLink,
  ListPaymentLinksParams,
  PaymentIntent,
  ReceivedPayment,
  ListReceivedPaymentsParams,
  CreateWebhookParams,
  Webhook,
  WebhookCreated,
  WebhookPayload,
  RateLimitInfo,
  ApiErrorResponse,
  TrackEventParams,
  TrackEventResponse,
  BatchTrackResponse,
  UsageQuery,
  UsageItem,
  UsageResponse,
  CreateCustomerParams,
  CreateProductParams,
  CreateMeterParams,
  MeteringProduct,
  Meter,
  ProductCustomer,
} from './types'

export { mountCheckout } from './checkout/checkout'
export type {
  CheckoutMountOptions,
  CheckoutPayment,
  CheckoutError,
  CheckoutInstance,
  CheckoutTheme,
} from './checkout/types'
