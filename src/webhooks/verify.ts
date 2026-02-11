import { createHmac, timingSafeEqual } from 'crypto'

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
