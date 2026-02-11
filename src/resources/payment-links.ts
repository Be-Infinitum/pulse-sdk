import type { HttpClient } from '../client'
import type {
  CreatePaymentLinkParams,
  ListPaymentLinksParams,
  PaymentIntent,
  PaymentLink,
} from '../types'

export class PaymentLinksResource {
  constructor(private readonly client: HttpClient) {}

  async create(params: CreatePaymentLinkParams): Promise<PaymentLink> {
    return this.client.request<PaymentLink>('POST', '/payment-links', {
      body: params,
    })
  }

  async list(params?: ListPaymentLinksParams): Promise<PaymentLink[]> {
    return this.client.request<PaymentLink[]>('GET', '/payment-links', {
      query: {
        limit: params?.limit,
        offset: params?.offset,
      },
    })
  }

  async get(linkId: string): Promise<PaymentLink> {
    return this.client.request<PaymentLink>('GET', `/payment-links/${linkId}`)
  }

  async listIntents(linkId: string): Promise<PaymentIntent[]> {
    return this.client.request<PaymentIntent[]>(
      'GET',
      `/payment-links/${linkId}/intents`
    )
  }
}
