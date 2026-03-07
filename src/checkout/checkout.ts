import type {
    CheckoutError,
    CheckoutInstance,
    CheckoutMountOptions,
    CheckoutPayment,
} from './types'

const DEFAULT_BASE_URL = 'https://app.beinfi.com'

/**
 * Mount the Pulse checkout widget into a DOM element.
 * Embeds an iframe-based checkout that handles payment flow (crypto, PIX)
 * and communicates back via postMessage events.
 *
 * @param selector - A CSS selector string or an HTMLElement to mount the checkout into.
 * @param options - Checkout configuration including the payment link ID and event callbacks.
 * @returns A {@link CheckoutInstance} with `unmount()` and `on()` methods.
 * @throws {Error} If the container element is not found.
 *
 * @example
 * ```typescript
 * import { Pulse } from '@beinfi/pulse-sdk'
 *
 * // Mount into a div
 * const checkout = Pulse.checkout.mount('#checkout-container', {
 *   linkId: 'abc-123',
 *   theme: {
 *     background: '#0f0f23',
 *     accent: '#6366f1',
 *   },
 *   onReady: () => console.log('Checkout loaded'),
 *   onSuccess: (payment) => {
 *     console.log('Payment confirmed!', payment.paymentIntentId)
 *     checkout.unmount()
 *   },
 *   onError: (err) => console.error('Payment failed:', err.message),
 * })
 *
 * // Alternative: use .on() event listeners
 * checkout.on('success', (payment) => {
 *   window.location.href = '/thank-you'
 * })
 * ```
 *
 * @example
 * ```typescript
 * // Standalone import
 * import { mountCheckout } from '@beinfi/pulse-sdk'
 *
 * const instance = mountCheckout('#checkout', { linkId: 'abc-123' })
 * ```
 */
export function mountCheckout(
  selector: string | HTMLElement,
  options: CheckoutMountOptions,
): CheckoutInstance {
  const container =
    typeof selector === 'string' ? document.querySelector<HTMLElement>(selector) : selector

  if (!container) {
    throw new Error(`[Pulse Checkout] Container not found: ${selector}`)
  }

  // Validate: either linkId OR (productId + publishableKey), not both
  const hasLink = !!options.linkId
  const hasProduct = !!options.productId
  if (!hasLink && !hasProduct) {
    throw new Error('[Pulse Checkout] Either linkId or productId is required')
  }
  if (hasLink && hasProduct) {
    throw new Error('[Pulse Checkout] Provide either linkId or productId, not both')
  }
  if (hasProduct && !options.publishableKey) {
    throw new Error('[Pulse Checkout] publishableKey is required when using productId')
  }

  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '')
  const allowedOrigin = new URL(baseUrl).origin

  // Event handlers registry for .on()
  const handlers: Record<string, Array<(...args: any[]) => void>> = {}

  function emit(event: string, ...args: any[]) {
    for (const handler of handlers[event] ?? []) {
      handler(...args)
    }
  }

  // Build iframe URL
  let iframeSrc: string
  if (options.productId) {
    iframeSrc = `${baseUrl}/embed/pay/product/${options.productId}?pk=${encodeURIComponent(options.publishableKey!)}`
  } else {
    iframeSrc = `${baseUrl}/embed/pay/${options.linkId}`
  }

  // Create iframe
  const iframe = document.createElement('iframe')
  iframe.src = iframeSrc
  iframe.style.width = '100%'
  iframe.style.border = 'none'
  iframe.style.colorScheme = 'normal'
  iframe.setAttribute('allowtransparency', 'true')
  iframe.allow = 'clipboard-write'

  function handleMessage(event: MessageEvent) {
    if (event.origin !== allowedOrigin) return

    const { type, ...data } = event.data ?? {}

    switch (type) {
      case 'pulse:ready':
        if (options.theme) {
          iframe.contentWindow?.postMessage(
            { type: 'pulse:config', theme: options.theme },
            allowedOrigin,
          )
        }
        options.onReady?.()
        emit('ready')
        break

      case 'pulse:resize':
        if (typeof data.height === 'number') {
          iframe.style.height = `${data.height}px`
        }
        break

      case 'pulse:success': {
        const payment = data.payment as CheckoutPayment
        options.onSuccess?.(payment)
        emit('success', payment)
        break
      }

      case 'pulse:error': {
        const error = data.error as CheckoutError
        options.onError?.(error)
        emit('error', error)
        break
      }
    }
  }

  window.addEventListener('message', handleMessage)
  container.appendChild(iframe)

  return {
    unmount() {
      window.removeEventListener('message', handleMessage)
      iframe.remove()
      options.onClose?.()
      emit('close')
    },
    on(event, handler) {
      if (!handlers[event]) handlers[event] = []
      handlers[event].push(handler)
    },
  }
}
