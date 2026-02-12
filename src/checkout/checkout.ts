import type {
  CheckoutMountOptions,
  CheckoutInstance,
  CheckoutPayment,
  CheckoutError,
} from './types'

const DEFAULT_BASE_URL = 'https://pulse.beinfi.com'

export function mountCheckout(
  selector: string | HTMLElement,
  options: CheckoutMountOptions,
): CheckoutInstance {
  const container =
    typeof selector === 'string' ? document.querySelector<HTMLElement>(selector) : selector

  if (!container) {
    throw new Error(`[Pulse Checkout] Container not found: ${selector}`)
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

  // Create iframe
  const iframe = document.createElement('iframe')
  iframe.src = `${baseUrl}/embed/pay/${options.linkId}`
  iframe.style.width = '100%'
  iframe.style.border = 'none'
  iframe.style.minHeight = '600px'
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
