# Quickstart — @beinfi/pulse-sdk

Complete integration guide. Every code block is self-contained and runnable.

## 1. Install

```bash
npm install @beinfi/pulse-sdk
```

## 2. Create a Client

```typescript
import { Pulse } from '@beinfi/pulse-sdk'

const pulse = new Pulse('sk_live_your_api_key_here')
```

You can also pass a config object:

```typescript
const pulse = new Pulse({
  apiKey: 'sk_live_your_api_key_here',
  baseUrl: 'https://api.beinfi.com', // default, can be omitted
})
```

## 3. Create a Payment Link

```typescript
import { Pulse } from '@beinfi/pulse-sdk'

const pulse = new Pulse('sk_live_your_api_key_here')

const link = await pulse.paymentLinks.create({
  title: 'Web Development',
  amount: '150.00',
  currency: 'USD',
  description: 'Landing page development',
})

console.log('Payment link created:', link.id)
console.log('Share this URL: https://app.beinfi.com/pay/' + link.slug)
```

## 4. List and Fetch Payment Links

```typescript
// List with pagination
const links = await pulse.paymentLinks.list({ limit: 10, offset: 0 })
for (const link of links) {
  console.log(link.title, link.amount, link.status)
}

// Get a specific link
const link = await pulse.paymentLinks.get('link-uuid-here')

// List payment attempts for a link
const intents = await pulse.paymentLinks.listIntents('link-uuid-here')
const confirmed = intents.filter(i => i.status === 'confirmed')
console.log(`${confirmed.length} confirmed payments`)
```

## 5. Set Up Webhooks

```typescript
import { Pulse } from '@beinfi/pulse-sdk'

const pulse = new Pulse('sk_live_your_api_key_here')

// Create a webhook subscription
const webhook = await pulse.webhooks.create({
  url: 'https://your-app.com/api/webhook',
  events: ['payment.confirmed'],
})

// IMPORTANT: Save this secret — it's only returned once!
console.log('Webhook secret:', webhook.secret)
// Store in your environment: PULSE_WEBHOOK_SECRET=...
```

## 6. Verify Webhook Signatures

When Pulse delivers a webhook, it includes an HMAC-SHA256 signature in the `X-Pulse-Signature` header.

### Express Example

```typescript
import express from 'express'
import { Pulse, type WebhookPayload } from '@beinfi/pulse-sdk'

const app = express()

app.post(
  '/api/webhook',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const rawBody = req.body.toString()
    const signature = req.headers['x-pulse-signature'] as string

    const isValid = Pulse.webhooks.verifySignature(
      rawBody,
      signature,
      process.env.PULSE_WEBHOOK_SECRET!,
    )

    if (!isValid) {
      return res.status(401).send('Invalid signature')
    }

    const payload: WebhookPayload = JSON.parse(rawBody)
    console.log('Payment confirmed:', payload.paymentIntentId)
    console.log('Amount:', payload.amount, payload.currency)
    console.log('Method:', payload.method)

    // Process the payment (e.g. fulfill order, send email)

    res.sendStatus(200)
  },
)

app.listen(3000)
```

### Next.js App Router Example

```typescript
// app/api/webhook/route.ts
import { Pulse, type WebhookPayload } from '@beinfi/pulse-sdk'

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-pulse-signature')!

  const isValid = Pulse.webhooks.verifySignature(
    rawBody,
    signature,
    process.env.PULSE_WEBHOOK_SECRET!,
  )

  if (!isValid) {
    return new Response('Invalid signature', { status: 401 })
  }

  const payload: WebhookPayload = JSON.parse(rawBody)
  console.log('Payment confirmed:', payload.paymentIntentId)

  // Process the payment...

  return new Response('OK', { status: 200 })
}
```

## 7. Embed the Checkout Widget (Browser)

Mount an iframe-based checkout directly into your page:

```html
<div id="checkout-container"></div>

<script type="module">
  import { Pulse } from '@beinfi/pulse-sdk'

  const checkout = Pulse.checkout.mount('#checkout-container', {
    linkId: 'your-payment-link-id',
    theme: {
      background: '#0f0f23',
      foreground: '#ffffff',
      accent: '#6366f1',
    },
    onReady: () => console.log('Checkout loaded'),
    onSuccess: (payment) => {
      console.log('Paid!', payment.paymentIntentId, payment.amount)
      checkout.unmount()
      window.location.href = '/thank-you'
    },
    onError: (err) => console.error('Payment error:', err.message),
  })
</script>
```

### React Example

```tsx
import { useEffect, useRef } from 'react'
import { Pulse } from '@beinfi/pulse-sdk'

export function Checkout({ linkId }: { linkId: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return

    const instance = Pulse.checkout.mount(ref.current, {
      linkId,
      onSuccess: (payment) => {
        console.log('Payment confirmed:', payment)
      },
    })

    return () => instance.unmount()
  }, [linkId])

  return <div ref={ref} />
}
```

## 8. Error Handling

```typescript
import {
  Pulse,
  PulseApiError,
  PulseAuthenticationError,
  PulseRateLimitError,
} from '@beinfi/pulse-sdk'

const pulse = new Pulse('sk_live_your_api_key_here')

try {
  await pulse.paymentLinks.create({ title: 'Test', amount: '10.00' })
} catch (err) {
  if (err instanceof PulseAuthenticationError) {
    // 401 — invalid, expired, or revoked API key
    console.error('Authentication failed:', err.message)
  } else if (err instanceof PulseRateLimitError) {
    // 429 — rate limit exceeded
    console.log(`Rate limited. Retry in ${err.retryAfter} seconds`)
    await new Promise((r) => setTimeout(r, err.retryAfter * 1000))
    // retry...
  } else if (err instanceof PulseApiError) {
    // Other API error (400, 404, 500, etc.)
    console.error(`API error ${err.status}: [${err.errorCode}] ${err.message}`)
  }
}
```
