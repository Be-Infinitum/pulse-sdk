# @infi/pulse-sdk

TypeScript SDK for the [Pulse Payment Platform](https://beinfi.com) API (`/api/v1`).

## Install

```bash
npm install @infi/pulse-sdk
```

## Usage

```typescript
import { Pulse } from '@infi/pulse-sdk'

const pulse = new Pulse('sk_live_...')
// or with options
const pulse = new Pulse({ apiKey: 'sk_live_...', baseUrl: 'https://api.beinfi.com' })
```

### Payment Links

```typescript
// Create
const link = await pulse.paymentLinks.create({
  title: 'Order #42',
  amount: '100.00',
  currency: 'USD', // optional, defaults to USD
  description: 'Widget purchase', // optional
})

// List
const links = await pulse.paymentLinks.list({ limit: 10, offset: 0 })

// Get
const link = await pulse.paymentLinks.get('link-id')

// List payment intents for a link
const intents = await pulse.paymentLinks.listIntents('link-id')
```

### Webhooks

```typescript
// Create
const wh = await pulse.webhooks.create({
  url: 'https://example.com/webhook',
  events: ['payment.confirmed'],
})
console.log(wh.secret) // save this

// List
const list = await pulse.webhooks.list()

// Delete
await pulse.webhooks.delete('webhook-id')
```

### Verify Webhook Signatures

```typescript
import { Pulse } from '@infi/pulse-sdk'

const isValid = Pulse.webhooks.verifySignature(rawBody, signatureHeader, secret)
```

The signature header format is `sha256={hmac_hex}`, sent as `X-Pulse-Signature`.

## Error Handling

```typescript
import { PulseApiError, PulseAuthenticationError, PulseRateLimitError } from '@infi/pulse-sdk'

try {
  await pulse.paymentLinks.create({ title: 'Test', amount: '10.00' })
} catch (err) {
  if (err instanceof PulseAuthenticationError) {
    // 401 - invalid API key
  } else if (err instanceof PulseRateLimitError) {
    // 429 - retry after err.retryAfter seconds
  } else if (err instanceof PulseApiError) {
    // other API error - err.status, err.errorCode, err.message
  }
}
```

## Example App

See [`examples/nextjs-checkout/`](./examples/nextjs-checkout/) for a full Next.js app that creates payment links and receives webhooks.

```bash
cd examples/nextjs-checkout
cp .env.example .env.local
# edit .env.local with your API key and webhook secret
npm install
npm run dev
```

## Build

```bash
npm run build  # outputs ESM + CJS + .d.ts to dist/
```
