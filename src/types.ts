// ============================================
// Config
// ============================================

export interface PulseConfig {
  apiKey: string
  baseUrl?: string
}

// ============================================
// Payment Links
// ============================================

export interface CreatePaymentLinkParams {
  title: string
  amount: string
  description?: string
  currency?: 'USD' | 'BRL'
}

export interface PaymentLink {
  id: string
  title: string
  description: string | null
  amount: string
  currency: string
  status: string
  slug: string
  userId: string
  createdAt: string
  updatedAt: string
}

export interface ListPaymentLinksParams {
  limit?: number
  offset?: number
}

export interface PaymentIntent {
  id: string
  paymentLinkId: string
  amount: string
  currency: string
  status: string
  method: string | null
  txHash: string | null
  confirmedAt: string | null
  createdAt: string
  updatedAt: string
}

// ============================================
// Received Payments
// ============================================

export interface ReceivedPayment {
  id: string
  amount: string
  currency: string
  method: string
  txHash: string | null
  confirmedAt: string
  paymentLinkId: string
  createdAt: string
}

export interface ListReceivedPaymentsParams {
  limit?: number
  offset?: number
}

// ============================================
// Webhooks
// ============================================

export interface CreateWebhookParams {
  url: string
  events: string[]
}

export interface Webhook {
  id: string
  url: string
  events: string[]
  isActive: boolean
  createdAt: string
}

export interface WebhookCreated extends Webhook {
  secret: string
}

// ============================================
// Webhook Event Payload
// ============================================

export interface WebhookPayload {
  paymentIntentId: string
  amount: string
  currency: string
  method: string
  confirmedAt: string
  txHash?: string
}

// ============================================
// Rate Limit
// ============================================

export interface RateLimitInfo {
  limit: number
  remaining: number
  reset: number
}

// ============================================
// API Error
// ============================================

export interface ApiErrorResponse {
  error: string
  message: string
}
