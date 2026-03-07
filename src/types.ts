// ============================================
// Config
// ============================================

/**
 * Configuration options for the Pulse SDK client.
 *
 * @example
 * ```typescript
 * const pulse = new Pulse({
 *   apiKey: 'sk_live_...',
 *   baseUrl: 'https://api.beinfi.com'
 * })
 * ```
 */
export interface PulseConfig {
  /** API key starting with `sk_live_`. Obtain from the Pulse dashboard under Developers > API Keys. */
  apiKey: string;
  /** Override the API base URL. Defaults to `https://api.beinfi.com`. */
  baseUrl?: string;
}

// ============================================
// Payment Links
// ============================================

/**
 * Parameters for creating a new payment link.
 *
 * @example
 * ```typescript
 * const link = await pulse.paymentLinks.create({
 *   title: 'Web Development',
 *   amount: '150.00',
 *   currency: 'USD',
 *   description: 'Landing page development'
 * })
 * ```
 */
export interface CreatePaymentLinkParams {
  /** Human-readable title shown to the payer (e.g. "Order #42"). */
  title: string;
  /** Payment amount as a decimal string (e.g. `"99.90"`). */
  amount: string;
  /** Optional description shown on the checkout page. */
  description?: string;
  /** Currency code. Defaults to `"USD"`. */
  currency?: "USD" | "BRL";
}

/**
 * A payment link object returned by the API.
 *
 * @example
 * ```typescript
 * const link = await pulse.paymentLinks.get('link-id')
 * console.log(link.title, link.amount, link.status)
 * ```
 */
export interface PaymentLink {
  /** Unique identifier (UUID). */
  id: string;
  /** Human-readable title. */
  title: string;
  /** Optional description, or `null` if not set. */
  description: string | null;
  /** Payment amount as a decimal string (e.g. `"100.00"`). */
  amount: string;
  /** Currency code (e.g. `"USD"`, `"BRL"`). */
  currency: string;
  /** Current status of the link (e.g. `"active"`, `"inactive"`). */
  status: string;
  /** URL-friendly slug for the payment page. */
  slug: string;
  /** ID of the user who created this link. */
  userId: string;
  /** ISO 8601 timestamp of creation. */
  createdAt: string;
  /** ISO 8601 timestamp of last update. */
  updatedAt: string;
}

/**
 * Query parameters for listing payment links.
 *
 * @example
 * ```typescript
 * const links = await pulse.paymentLinks.list({ limit: 10, offset: 0 })
 * ```
 */
export interface ListPaymentLinksParams {
  /** Maximum number of results to return. Defaults to 20. */
  limit?: number;
  /** Number of results to skip (for pagination). Defaults to 0. */
  offset?: number;
}

/**
 * A payment intent represents a single payment attempt against a payment link.
 *
 * @example
 * ```typescript
 * const intents = await pulse.paymentLinks.listIntents('link-id')
 * for (const intent of intents) {
 *   console.log(intent.status, intent.amount, intent.method)
 * }
 * ```
 */
export interface PaymentIntent {
  /** Unique identifier (UUID). */
  id: string;
  /** ID of the parent payment link. */
  paymentLinkId: string;
  /** Payment amount as a decimal string, or `null` if not yet determined. */
  amount: string;
  /** Currency code (e.g. `"USD"`). */
  currency: string;
  /** Intent status: `"pending"` | `"observed"` | `"confirmed"` | `"failed"` | `"expired"`. */
  status: string;
  /** Payment method used (e.g. `"crypto"`, `"pix"`), or `null` if not yet selected. */
  method: string | null;
  /** Blockchain transaction hash, or `null` if not a crypto payment. */
  txHash: string | null;
  /** ISO 8601 timestamp when the payment was confirmed, or `null`. */
  confirmedAt: string | null;
  /** ISO 8601 timestamp of creation. */
  createdAt: string;
  /** ISO 8601 timestamp of last update. */
  updatedAt: string;
}

// ============================================
// Received Payments
// ============================================

/**
 * A confirmed payment that has been received and credited.
 *
 * @example
 * ```typescript
 * // Received payments are delivered via webhook payloads
 * // or can be queried from the dashboard
 * ```
 */
export interface ReceivedPayment {
  /** Unique identifier (UUID). */
  id: string;
  /** Payment amount as a decimal string. */
  amount: string;
  /** Currency code. */
  currency: string;
  /** Payment method (e.g. `"crypto"`, `"pix"`). */
  method: string;
  /** Blockchain transaction hash, or `null` for non-crypto payments. */
  txHash: string | null;
  /** ISO 8601 timestamp when the payment was confirmed. */
  confirmedAt: string;
  /** ID of the payment link this payment belongs to. */
  paymentLinkId: string;
  /** ISO 8601 timestamp of creation. */
  createdAt: string;
}

/**
 * Query parameters for listing received payments.
 */
export interface ListReceivedPaymentsParams {
  /** Maximum number of results to return. */
  limit?: number;
  /** Number of results to skip (for pagination). */
  offset?: number;
}

// ============================================
// Webhooks
// ============================================

/**
 * Parameters for creating a new webhook subscription.
 *
 * @example
 * ```typescript
 * const wh = await pulse.webhooks.create({
 *   url: 'https://example.com/webhook',
 *   events: ['payment.confirmed']
 * })
 * // Save wh.secret — it's only returned once at creation time
 * ```
 */
export interface CreateWebhookParams {
  /** The HTTPS URL that will receive webhook POST requests. */
  url: string;
  /** Array of event types to subscribe to (e.g. `["payment.confirmed"]`). */
  events: string[];
}

/**
 * A webhook subscription object.
 *
 * @example
 * ```typescript
 * const webhooks = await pulse.webhooks.list()
 * for (const wh of webhooks) {
 *   console.log(wh.url, wh.events, wh.isActive)
 * }
 * ```
 */
export interface Webhook {
  /** Unique identifier (UUID). */
  id: string;
  /** The URL receiving webhook deliveries. */
  url: string;
  /** Event types this webhook is subscribed to. */
  events: string[];
  /** Whether the webhook is currently active. */
  isActive: boolean;
  /** ISO 8601 timestamp of creation. */
  createdAt: string;
}

/**
 * Webhook object returned after creation, includes the signing secret.
 * The `secret` is only returned once — store it securely.
 *
 * @example
 * ```typescript
 * const wh = await pulse.webhooks.create({
 *   url: 'https://example.com/webhook',
 *   events: ['payment.confirmed']
 * })
 * console.log(wh.secret) // "a1b2c3..." (64-char hex) — save this!
 * ```
 */
export interface WebhookCreated extends Webhook {
  /** HMAC signing secret (64-character hex string). Only returned at creation time. */
  secret: string;
}

// ============================================
// Webhook Event Payload
// ============================================

/**
 * The payload delivered to your webhook endpoint when a `payment.confirmed` event fires.
 * Sent as a JSON POST with `X-Pulse-Signature` and `X-Pulse-Event` headers.
 *
 * @example
 * ```typescript
 * // In your webhook handler:
 * app.post('/webhook', (req) => {
 *   const isValid = Pulse.webhooks.verifySignature(
 *     req.rawBody,
 *     req.headers['x-pulse-signature'],
 *     process.env.WEBHOOK_SECRET
 *   )
 *   if (!isValid) return res.status(401).send('Invalid signature')
 *
 *   const payload: WebhookPayload = req.body
 *   console.log('Payment confirmed:', payload.paymentIntentId, payload.amount)
 * })
 * ```
 */
export interface WebhookPayload {
  /** ID of the confirmed payment intent. */
  paymentIntentId: string;
  /** Payment amount as a decimal string. */
  amount: string;
  /** Currency code. */
  currency: string;
  /** Payment method used (e.g. `"crypto"`, `"pix"`). */
  method: string;
  /** ISO 8601 timestamp when the payment was confirmed. */
  confirmedAt: string;
  /** Blockchain transaction hash (present for crypto payments). */
  txHash?: string;
}

// ============================================
// Metering
// ============================================

/**
 * Parameters for tracking a usage event.
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
export interface TrackEventParams {
  /** Idempotency key. Auto-generated if not provided. */
  eventId?: string;
  /** Meter ID or slug to track against. */
  meterId: string;
  /** Your customer's identifier (externalId). */
  customerId: string;
  /** Quantity consumed (e.g. number of tokens). */
  value: number | string;
  /** When the event occurred. Defaults to now. */
  timestamp?: Date;
  /** Additional metadata attached to the event. */
  metadata?: Record<string, unknown>;
}

/** A tracked event as returned by the API. */
export interface TrackEventResponse {
  id: string;
  eventId: string;
  meterId: string;
  customerId: string;
  value: string;
  timestamp: string;
  createdAt: string;
}

/** Result of a batch track operation. */
export interface BatchTrackResponse {
  accepted: number;
  failed: number;
  results: TrackEventResponse[];
  errors?: Array<{ eventId?: string; error: string }>;
}

/** Query parameters for aggregated usage. */
export interface UsageQuery {
  customerId?: string;
  startDate?: string;
  endDate?: string;
}

/** A single meter's aggregated usage. */
export interface UsageItem {
  meterId: string;
  meterName: string;
  unit: string;
  unitPrice: string;
  totalValue: string;
  totalAmount: string;
  eventCount: number;
}

/** Aggregated usage response. */
export interface UsageResponse {
  data: UsageItem[];
}

/** Parameters for creating a customer on a product. */
export interface CreateCustomerParams {
  externalId: string;
  name?: string;
  email?: string;
  metadata?: Record<string, unknown>;
}

/** Parameters for creating a product. */
export interface CreateProductParams {
  name: string;
  type?: "agent" | "item";
  description?: string;
  pricingModel?: "subscription" | "one_time" | "usage" | "prepaid";
  price?: string;
  billingCycle?: "weekly" | "monthly" | "annual";
  currency?: string;
}

/** Parameters for creating a meter on a product. */
export interface CreateMeterParams {
  name: string;
  displayName: string;
  unit: "token" | "request" | "unit";
  unitPrice: string;
}

/** A meter object returned by the API. */
export interface Meter {
  id: string;
  name: string;
  displayName: string;
  unit: string;
  unitPrice: string;
  status: string;
}

/** A product with meters. */
export interface MeteringProduct {
  id: string;
  name: string;
  type: string;
  description?: string;
  pricingModel: string;
  price?: string | null;
  billingCycle?: string | null;
  currency: string;
  status: string;
  meters: Array<{
    id: string;
    name: string;
    displayName: string;
    unit: string;
    unitPrice: string;
  }>;
}

/** A customer linked to a product. */
export interface ProductCustomer {
  id: string;
  externalId: string;
  name?: string | null;
  email?: string | null;
  creditBalance?: string | null;
  creditTotal?: string | null;
  creditAlertSent?: boolean;
  createdAt: string;
}

// ============================================
// Credits (Prepaid)
// ============================================

/** Credit balance for a prepaid customer. */
export interface CreditBalance {
  creditBalance: string | null;
  creditTotal: string | null;
  creditAlertSent: boolean;
}

// ============================================
// Subscriptions
// ============================================

/** A subscription object returned by the API. */
export interface Subscription {
  id: string;
  status: string;
  billingCycle: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextBillingDate: string;
  createdAt: string;
  productCustomer: {
    id: string;
    externalId: string;
    name?: string | null;
    email?: string | null;
  };
}

/** Query parameters for listing subscriptions. */
export interface ListSubscriptionsParams {
  status?: string;
  limit?: number;
  offset?: number;
}

// ============================================
// Invoices
// ============================================

/** An invoice object returned by the API. */
export interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  subtotal: string;
  total: string;
  currency: string;
  paymentLinkId?: string | null;
  paidAt?: string | null;
  dueDate?: string | null;
  createdAt: string;
  lineItems: Array<{
    id: string;
    type?: string;
    meterName: string;
    description: string;
    quantity: string;
    unitPrice: string;
    amount: string;
  }>;
  productCustomer: {
    id: string;
    externalId: string;
    name?: string | null;
  };
}

/** Parameters for generating an invoice. */
export interface GenerateInvoiceParams {
  customerId: string;
  periodStart: string;
  periodEnd: string;
}

// ============================================
// Rate Limit
// ============================================

/**
 * Rate limit information returned in API response headers.
 * Available on every response as `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.
 */
export interface RateLimitInfo {
  /** Maximum requests allowed per minute for your tier (free=100, pro=1000, enterprise=5000). */
  limit: number;
  /** Remaining requests in the current window. */
  remaining: number;
  /** Unix timestamp (seconds) when the rate limit window resets. */
  reset: number;
}

// ============================================
// API Error
// ============================================

/**
 * Shape of error responses returned by the Pulse API.
 *
 * @example
 * ```json
 * { "error": "unauthorized", "message": "Invalid API key" }
 * ```
 */
export interface ApiErrorResponse {
  /** Machine-readable error code (e.g. `"unauthorized"`, `"rate_limit_exceeded"`). */
  error: string;
  /** Human-readable error description. */
  message: string;
}
