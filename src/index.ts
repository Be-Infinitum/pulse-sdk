import { HttpClient } from './client'
import { PaymentLinksResource } from './resources/payment-links'
import { WebhooksResource } from './resources/webhooks'
import { verifyWebhookSignature } from './webhooks/verify'
import type { PulseConfig } from './types'

export class Pulse {
  public readonly paymentLinks: PaymentLinksResource
  public readonly webhooks: WebhooksResource

  private readonly client: HttpClient

  static webhooks = {
    verifySignature: verifyWebhookSignature,
  }

  constructor(config: string | PulseConfig) {
    const apiKey = typeof config === 'string' ? config : config.apiKey
    const baseUrl = typeof config === 'string' ? undefined : config.baseUrl

    this.client = new HttpClient(apiKey, baseUrl)
    this.paymentLinks = new PaymentLinksResource(this.client)
    this.webhooks = new WebhooksResource(this.client)
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
} from './types'
