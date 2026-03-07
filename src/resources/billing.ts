import type { HttpClient } from "../client";
import type {
  Subscription,
  ListSubscriptionsParams,
  Invoice,
  GenerateInvoiceParams,
} from "../types";

/**
 * Resource for billing operations: subscriptions and invoices.
 * Access via `pulse.billing`.
 *
 * @example
 * ```typescript
 * const pulse = new Pulse('sk_live_...')
 *
 * // List subscriptions
 * const subs = await pulse.billing.listSubscriptions('product-id')
 *
 * // Generate an invoice
 * const invoice = await pulse.billing.generateInvoice('product-id', {
 *   customerId: 'user_123',
 *   periodStart: '2026-01-01T00:00:00Z',
 *   periodEnd: '2026-02-01T00:00:00Z',
 * })
 * ```
 */
export class BillingResource {
  constructor(private readonly client: HttpClient) {}

  // ── Subscriptions ──────────────────────────────

  /**
   * List subscriptions for a product.
   *
   * @param productId - The product UUID.
   * @param params - Optional filters (status, limit, offset).
   * @returns Paginated subscription list.
   */
  async listSubscriptions(
    productId: string,
    params?: ListSubscriptionsParams,
  ): Promise<{ items: Subscription[]; total: number }> {
    return this.client.request<{ items: Subscription[]; total: number }>(
      "GET",
      `/billing/products/${productId}/subscriptions`,
      {
        query: {
          status: params?.status,
          limit: params?.limit,
          offset: params?.offset,
        },
      },
    );
  }

  /**
   * Get a single subscription by ID.
   *
   * @param productId - The product UUID.
   * @param subscriptionId - The subscription UUID.
   * @returns The subscription object.
   */
  async getSubscription(productId: string, subscriptionId: string): Promise<Subscription> {
    return this.client.request<Subscription>(
      "GET",
      `/billing/products/${productId}/subscriptions/${subscriptionId}`,
    );
  }

  /**
   * Update a subscription (pause, resume, or cancel).
   *
   * @param productId - The product UUID.
   * @param subscriptionId - The subscription UUID.
   * @param action - The action to perform.
   * @returns The updated subscription.
   *
   * @example
   * ```typescript
   * await pulse.billing.updateSubscription('product-id', 'sub-id', 'pause')
   * await pulse.billing.updateSubscription('product-id', 'sub-id', 'resume')
   * await pulse.billing.updateSubscription('product-id', 'sub-id', 'cancel')
   * ```
   */
  async updateSubscription(
    productId: string,
    subscriptionId: string,
    action: "pause" | "resume" | "cancel",
  ): Promise<Subscription> {
    return this.client.request<Subscription>(
      "PATCH",
      `/billing/products/${productId}/subscriptions/${subscriptionId}`,
      { body: { action } },
    );
  }

  // ── Invoices ───────────────────────────────────

  /**
   * List invoices for a product.
   *
   * @param productId - The product UUID.
   * @returns Array of invoice objects.
   */
  async listInvoices(productId: string): Promise<Invoice[]> {
    return this.client.request<Invoice[]>("GET", `/billing/products/${productId}/invoices`);
  }

  /**
   * Get a single invoice by ID.
   *
   * @param productId - The product UUID.
   * @param invoiceId - The invoice UUID.
   * @returns The invoice object.
   */
  async getInvoice(productId: string, invoiceId: string): Promise<Invoice> {
    return this.client.request<Invoice>(
      "GET",
      `/billing/products/${productId}/invoices/${invoiceId}`,
    );
  }

  /**
   * Generate an invoice for a customer's usage during a period.
   *
   * @param productId - The product UUID.
   * @param data - Invoice generation params (customerId, periodStart, periodEnd).
   * @returns The created invoice.
   *
   * @example
   * ```typescript
   * const invoice = await pulse.billing.generateInvoice('product-id', {
   *   customerId: 'user_123',
   *   periodStart: '2026-01-01T00:00:00Z',
   *   periodEnd: '2026-02-01T00:00:00Z',
   * })
   * console.log(`Invoice ${invoice.invoiceNumber}: $${invoice.total}`)
   * ```
   */
  async generateInvoice(productId: string, data: GenerateInvoiceParams): Promise<Invoice> {
    return this.client.request<Invoice>("POST", `/billing/products/${productId}/invoices`, {
      body: data,
    });
  }

  /**
   * Send an invoice email to the customer.
   *
   * @param productId - The product UUID.
   * @param invoiceId - The invoice UUID.
   * @returns Confirmation object.
   */
  async sendInvoice(
    productId: string,
    invoiceId: string,
  ): Promise<{ sent: boolean; invoiceId: string }> {
    return this.client.request<{ sent: boolean; invoiceId: string }>(
      "POST",
      `/billing/products/${productId}/invoices/${invoiceId}/send`,
    );
  }
}
