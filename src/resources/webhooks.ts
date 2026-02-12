import type { HttpClient } from '../client'
import type { CreateWebhookParams, Webhook, WebhookCreated } from '../types'

/**
 * Resource for managing webhook subscriptions.
 * Access via `pulse.webhooks`.
 *
 * @example
 * ```typescript
 * const pulse = new Pulse('sk_live_...')
 *
 * // Create a webhook
 * const wh = await pulse.webhooks.create({
 *   url: 'https://example.com/webhook',
 *   events: ['payment.confirmed'],
 * })
 * console.log(wh.secret) // save this!
 *
 * // List webhooks
 * const list = await pulse.webhooks.list()
 * ```
 */
export class WebhooksResource {
  constructor(private readonly client: HttpClient) {}

  /**
   * Create a new webhook subscription.
   * The response includes a `secret` field (64-char hex) used to verify signatures.
   * **Store this secret securely** — it is only returned once at creation time.
   *
   * @param params - Webhook URL and event types to subscribe to.
   * @returns The created webhook with its signing secret.
   * @throws {PulseAuthenticationError} If the API key is invalid.
   *
   * @example
   * ```typescript
   * const wh = await pulse.webhooks.create({
   *   url: 'https://example.com/webhook',
   *   events: ['payment.confirmed'],
   * })
   * // Save wh.secret to your environment/secrets manager
   * console.log('Webhook secret:', wh.secret)
   * ```
   */
  async create(params: CreateWebhookParams): Promise<WebhookCreated> {
    return this.client.request<WebhookCreated>('POST', '/webhooks', {
      body: params,
    })
  }

  /**
   * List all webhook subscriptions for the authenticated user.
   *
   * @returns Array of webhook objects (without secrets).
   * @throws {PulseAuthenticationError} If the API key is invalid.
   *
   * @example
   * ```typescript
   * const webhooks = await pulse.webhooks.list()
   * for (const wh of webhooks) {
   *   console.log(wh.url, wh.events, wh.isActive)
   * }
   * ```
   */
  async list(): Promise<Webhook[]> {
    return this.client.request<Webhook[]>('GET', '/webhooks')
  }

  /**
   * Delete a webhook subscription.
   *
   * @param id - The webhook UUID to delete.
   * @throws {PulseAuthenticationError} If the API key is invalid.
   *
   * @example
   * ```typescript
   * await pulse.webhooks.delete('webhook-id')
   * ```
   */
  async delete(id: string): Promise<void> {
    return this.client.request<void>('DELETE', `/webhooks/${id}`)
  }
}
