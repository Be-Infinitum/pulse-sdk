import { mountCheckout } from './checkout/checkout'
import type { CheckoutMountOptions, CheckoutInstance } from './checkout/types'

// Expose on window for <script> tag usage
;(window as any).PulseCheckout = { mount: mountCheckout }

// Auto-init: look for #pulse-checkout[data-link-id]
function autoInit() {
  const el = document.getElementById('pulse-checkout')
  if (!el) return

  const linkId = el.dataset.linkId
  if (!linkId) return

  const baseUrl = el.dataset.baseUrl

  mountCheckout(el, {
    linkId,
    baseUrl,
    onReady() {
      el.dispatchEvent(new CustomEvent('pulse:ready'))
    },
    onSuccess(payment) {
      el.dispatchEvent(new CustomEvent('pulse:success', { detail: payment }))
    },
    onError(error) {
      el.dispatchEvent(new CustomEvent('pulse:error', { detail: error }))
    },
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoInit)
} else {
  autoInit()
}
