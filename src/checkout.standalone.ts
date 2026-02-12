import { mountCheckout } from './checkout/checkout'
import type { CheckoutMountOptions, CheckoutInstance, CheckoutTheme } from './checkout/types'

// Expose on window for <script> tag usage
;(window as any).PulseCheckout = { mount: mountCheckout }

function parseThemeFromDataset(el: HTMLElement): CheckoutTheme | undefined {
  const theme: CheckoutTheme = {}
  if (el.dataset.themeBackground) theme.background = el.dataset.themeBackground
  if (el.dataset.themeForeground) theme.foreground = el.dataset.themeForeground
  if (el.dataset.themeCard) theme.card = el.dataset.themeCard
  if (el.dataset.themeAccent) theme.accent = el.dataset.themeAccent
  if (el.dataset.themeAccentForeground) theme.accentForeground = el.dataset.themeAccentForeground
  return Object.keys(theme).length > 0 ? theme : undefined
}

// Auto-init: look for #pulse-checkout[data-link-id]
function autoInit() {
  const el = document.getElementById('pulse-checkout')
  if (!el) return

  const linkId = el.dataset.linkId
  if (!linkId) return

  const baseUrl = el.dataset.baseUrl
  const theme = parseThemeFromDataset(el)

  mountCheckout(el, {
    linkId,
    baseUrl,
    theme,
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
