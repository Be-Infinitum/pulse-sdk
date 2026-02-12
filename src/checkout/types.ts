export interface CheckoutPayment {
  paymentIntentId: string
  amount: string
  currency: string
  method: string
  txHash?: string
}

export interface CheckoutError {
  message: string
  code?: string
}

export interface CheckoutTheme {
  background?: string
  foreground?: string
  card?: string
  accent?: string
  accentForeground?: string
}

export interface CheckoutMountOptions {
  linkId: string
  baseUrl?: string
  theme?: CheckoutTheme
  onReady?: () => void
  onSuccess?: (payment: CheckoutPayment) => void
  onError?: (error: CheckoutError) => void
  onClose?: () => void
}

export interface CheckoutInstance {
  unmount: () => void
  on: (event: 'ready' | 'success' | 'error' | 'close', handler: (...args: any[]) => void) => void
}
