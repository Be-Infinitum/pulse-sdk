import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Pulse } from '../index'
import { PulseError } from '../errors'
import { PaymentLinksResource } from '../resources/payment-links'
import { WebhooksResource } from '../resources/webhooks'
import { MeteringResource } from '../resources/metering'

// Stub fetch so HttpClient constructor doesn't fail when making requests
beforeEach(() => {
  vi.restoreAllMocks()
})

describe('Pulse', () => {
  describe('constructor', () => {
    it('accepts string shorthand (API key)', () => {
      const pulse = new Pulse('sk_live_test123')
      expect(pulse).toBeInstanceOf(Pulse)
    })

    it('accepts config object', () => {
      const pulse = new Pulse({ apiKey: 'sk_live_test123' })
      expect(pulse).toBeInstanceOf(Pulse)
    })

    it('accepts config object with custom baseUrl', () => {
      const pulse = new Pulse({
        apiKey: 'sk_live_test123',
        baseUrl: 'https://custom.api.com',
      })
      expect(pulse).toBeInstanceOf(Pulse)
    })

    it('propagates validation error for invalid API key', () => {
      expect(() => new Pulse('bad_key')).toThrow(PulseError)
      expect(() => new Pulse({ apiKey: 'bad_key' })).toThrow(PulseError)
    })
  })

  describe('resources', () => {
    it('initializes paymentLinks resource', () => {
      const pulse = new Pulse('sk_live_test')
      expect(pulse.paymentLinks).toBeInstanceOf(PaymentLinksResource)
    })

    it('initializes webhooks resource', () => {
      const pulse = new Pulse('sk_live_test')
      expect(pulse.webhooks).toBeInstanceOf(WebhooksResource)
    })

    it('initializes metering resource', () => {
      const pulse = new Pulse('sk_live_test')
      expect(pulse.metering).toBeInstanceOf(MeteringResource)
    })
  })

  describe('static members', () => {
    it('has static Pulse.webhooks.verifySignature', () => {
      expect(typeof Pulse.webhooks.verifySignature).toBe('function')
    })

    it('has static Pulse.checkout.mount', () => {
      expect(typeof Pulse.checkout.mount).toBe('function')
    })
  })
})
