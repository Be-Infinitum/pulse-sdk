import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Verify the HMAC-SHA256 signature of an incoming webhook request.
 * Use this to ensure the request came from Pulse and wasn't tampered with.
 *
 * The signature is sent in the `X-Pulse-Signature` header as `sha256={hex}`.
 *
 * @param rawBody - The raw request body as a string (not parsed JSON).
 * @param signatureHeader - The `X-Pulse-Signature` header value (e.g. `"sha256=abc123..."`).
 * @param secret - Your webhook signing secret (64-char hex, from webhook creation).
 * @returns `true` if the signature is valid, `false` otherwise.
 *
 * @example
 * ```typescript
 * import { Pulse } from '@infi/pulse-sdk'
 *
 * // Express/Node.js example
 * app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
 *   const isValid = Pulse.webhooks.verifySignature(
 *     req.body.toString(),
 *     req.headers['x-pulse-signature'] as string,
 *     process.env.PULSE_WEBHOOK_SECRET!
 *   )
 *
 *   if (!isValid) {
 *     return res.status(401).send('Invalid signature')
 *   }
 *
 *   const event = JSON.parse(req.body.toString())
 *   console.log('Payment confirmed:', event.paymentIntentId)
 *   res.sendStatus(200)
 * })
 * ```
 *
 * @example
 * ```typescript
 * // Standalone import
 * import { verifyWebhookSignature } from '@infi/pulse-sdk'
 *
 * const valid = verifyWebhookSignature(rawBody, signatureHeader, secret)
 * ```
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string
): boolean {
  const expectedSig = createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')

  const receivedSig = signatureHeader.startsWith('sha256=')
    ? signatureHeader.slice(7)
    : signatureHeader

  if (expectedSig.length !== receivedSig.length) {
    return false
  }

  return timingSafeEqual(
    Buffer.from(expectedSig, 'hex'),
    Buffer.from(receivedSig, 'hex')
  )
}
