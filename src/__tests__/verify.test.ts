import { describe, it, expect } from 'vitest'
import { createHmac } from 'crypto'
import { verifyWebhookSignature } from '../webhooks/verify'

function sign(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('hex')
}

const SECRET = 'a'.repeat(64)

describe('verifyWebhookSignature', () => {
  it('returns true for valid signature with sha256= prefix', () => {
    const body = '{"paymentIntentId":"pi_1"}'
    const sig = `sha256=${sign(body, SECRET)}`

    expect(verifyWebhookSignature(body, sig, SECRET)).toBe(true)
  })

  it('returns true for valid signature without prefix', () => {
    const body = '{"paymentIntentId":"pi_1"}'
    const sig = sign(body, SECRET)

    expect(verifyWebhookSignature(body, sig, SECRET)).toBe(true)
  })

  it('returns false for invalid signature', () => {
    const body = '{"paymentIntentId":"pi_1"}'
    const sig = 'sha256=' + 'f'.repeat(64)

    expect(verifyWebhookSignature(body, sig, SECRET)).toBe(false)
  })

  it('returns false when body is tampered', () => {
    const body = '{"paymentIntentId":"pi_1"}'
    const sig = `sha256=${sign(body, SECRET)}`

    expect(verifyWebhookSignature(body + 'tampered', sig, SECRET)).toBe(false)
  })

  it('returns false when secret is wrong', () => {
    const body = '{"data":"test"}'
    const sig = `sha256=${sign(body, SECRET)}`
    const wrongSecret = 'b'.repeat(64)

    expect(verifyWebhookSignature(body, sig, wrongSecret)).toBe(false)
  })

  it('strips sha256= prefix correctly', () => {
    const body = 'test body'
    const rawSig = sign(body, SECRET)
    const prefixed = `sha256=${rawSig}`

    // Both should produce the same result
    const resultWithPrefix = verifyWebhookSignature(body, prefixed, SECRET)
    const resultWithoutPrefix = verifyWebhookSignature(body, rawSig, SECRET)
    expect(resultWithPrefix).toBe(true)
    expect(resultWithoutPrefix).toBe(true)
  })

  it('returns false for signature with wrong length', () => {
    const body = '{"data":"test"}'
    const shortSig = 'sha256=abcdef'

    expect(verifyWebhookSignature(body, shortSig, SECRET)).toBe(false)
  })

  it('works with empty body', () => {
    const body = ''
    const sig = `sha256=${sign(body, SECRET)}`

    expect(verifyWebhookSignature(body, sig, SECRET)).toBe(true)
  })

  it('works with large body', () => {
    const body = JSON.stringify({ data: 'x'.repeat(10000) })
    const sig = `sha256=${sign(body, SECRET)}`

    expect(verifyWebhookSignature(body, sig, SECRET)).toBe(true)
  })

  it('is consistent across multiple calls', () => {
    const body = '{"test":true}'
    const sig = `sha256=${sign(body, SECRET)}`

    // Verify multiple times to ensure no side effects
    expect(verifyWebhookSignature(body, sig, SECRET)).toBe(true)
    expect(verifyWebhookSignature(body, sig, SECRET)).toBe(true)
    expect(verifyWebhookSignature(body, sig, SECRET)).toBe(true)
  })
})
