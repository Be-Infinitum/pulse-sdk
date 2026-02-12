/**
 * Successful payment data returned by the checkout widget.
 */
export interface CheckoutPayment {
  /** ID of the completed payment intent. */
  paymentIntentId: string
  /** Payment amount as a decimal string. */
  amount: string
  /** Currency code (e.g. `"USD"`). */
  currency: string
  /** Payment method used (e.g. `"crypto"`, `"pix"`). */
  method: string
  /** Blockchain transaction hash (present for crypto payments). */
  txHash?: string
}

/**
 * Error object emitted by the checkout widget.
 */
export interface CheckoutError {
  /** Human-readable error message. */
  message: string
  /** Machine-readable error code. */
  code?: string
}

/**
 * Theme customization for the checkout widget.
 * All values are CSS color strings (hex, rgb, hsl, etc.).
 *
 * @example
 * ```typescript
 * const instance = Pulse.checkout.mount('#checkout', {
 *   linkId: 'link-id',
 *   theme: {
 *     background: '#1a1a2e',
 *     foreground: '#ffffff',
 *     accent: '#e94560',
 *   }
 * })
 * ```
 */
export interface CheckoutTheme {
  /** Background color of the checkout widget. */
  background?: string
  /** Primary text color. */
  foreground?: string
  /** Card/surface background color. */
  card?: string
  /** Accent color for buttons and interactive elements. */
  accent?: string
  /** Text color on accent-colored elements. */
  accentForeground?: string
}

/**
 * Options for mounting the Pulse checkout widget.
 *
 * @example
 * ```typescript
 * const instance = Pulse.checkout.mount('#checkout', {
 *   linkId: 'abc-123',
 *   onSuccess: (payment) => console.log('Paid!', payment),
 *   onError: (err) => console.error('Failed:', err.message),
 * })
 * ```
 */
export interface CheckoutMountOptions {
  /** The payment link ID to load in the checkout widget. */
  linkId: string
  /** Override the checkout base URL. Defaults to `https://pulse.beinfi.com`. */
  baseUrl?: string
  /** Custom theme colors for the checkout widget. */
  theme?: CheckoutTheme
  /** Called when the checkout iframe is ready and rendered. */
  onReady?: () => void
  /** Called when the payment is successfully confirmed. */
  onSuccess?: (payment: CheckoutPayment) => void
  /** Called when a payment error occurs. */
  onError?: (error: CheckoutError) => void
  /** Called when the checkout widget is unmounted/closed. */
  onClose?: () => void
}

/**
 * Handle returned by {@link mountCheckout}. Use it to control the checkout widget lifecycle.
 *
 * @example
 * ```typescript
 * const instance = Pulse.checkout.mount('#checkout', { linkId: 'abc-123' })
 *
 * // Listen for events
 * instance.on('success', (payment) => console.log('Paid!', payment))
 *
 * // Clean up when done
 * instance.unmount()
 * ```
 */
export interface CheckoutInstance {
  /** Remove the checkout iframe and clean up event listeners. */
  unmount: () => void
  /** Subscribe to checkout events: `"ready"`, `"success"`, `"error"`, `"close"`. */
  on: (event: 'ready' | 'success' | 'error' | 'close', handler: (...args: any[]) => void) => void
}
