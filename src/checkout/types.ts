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

export interface CheckoutMountOptions {
  linkId: string
  baseUrl?: string
  onReady?: () => void
  onSuccess?: (payment: CheckoutPayment) => void
  onError?: (error: CheckoutError) => void
  onClose?: () => void
}

export interface CheckoutInstance {
  unmount: () => void
  on: (event: 'ready' | 'success' | 'error' | 'close', handler: (...args: any[]) => void) => void
}
