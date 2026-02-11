import type { HttpClient } from '../client'
import type { CreateWebhookParams, Webhook, WebhookCreated } from '../types'

export class WebhooksResource {
  constructor(private readonly client: HttpClient) {}

  async create(params: CreateWebhookParams): Promise<WebhookCreated> {
    return this.client.request<WebhookCreated>('POST', '/webhooks', {
      body: params,
    })
  }

  async list(): Promise<Webhook[]> {
    return this.client.request<Webhook[]>('GET', '/webhooks')
  }

  async delete(id: string): Promise<void> {
    return this.client.request<void>('DELETE', `/webhooks/${id}`)
  }
}
