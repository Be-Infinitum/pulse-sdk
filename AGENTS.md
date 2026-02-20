# @beinfi/pulse-sdk

TypeScript SDK for the Pulse Payment Platform. Enables developers to create payment links, process crypto/PIX payments, verify webhooks, and embed checkout widgets. Zero runtime dependencies.

## Build & Dev

```bash
npm run build   # outputs ESM + CJS + .d.ts to dist/ (via tsup)
npm run dev     # watch mode
```

Package manager: yarn 4.x (corepack). TypeScript 5.6+, strict mode.

## Project Structure

```
src/
├── index.ts                 # Main export — Pulse class + re-exports
├── client.ts                # HttpClient — low-level fetch wrapper
├── errors.ts                # PulseError, PulseApiError, PulseAuthenticationError, PulseRateLimitError
├── types.ts                 # All shared TypeScript interfaces
├── resources/
│   ├── payment-links.ts     # PaymentLinksResource — create, list, get, listIntents
│   └── webhooks.ts          # WebhooksResource — create, list, delete
├── webhooks/
│   └── verify.ts            # verifyWebhookSignature() — HMAC-SHA256 verification
└── checkout/
    ├── checkout.ts           # mountCheckout() — iframe-based checkout widget
    └── types.ts              # Checkout-specific types
```

## Key Architecture Decisions

- **Zero runtime dependencies** — only Node.js `crypto` for webhook verification
- **Dual output** — ESM (`dist/index.js`) and CJS (`dist/index.cjs`) via tsup
- **HttpClient pattern** — all API calls go through `src/client.ts` which handles auth, rate limits, error mapping, and `{ data: ... }` response unwrapping
- **Resource classes** — each API domain (payment-links, webhooks) is a class that receives the HttpClient via constructor injection
- **Static utilities** — `Pulse.webhooks.verifySignature()` and `Pulse.checkout.mount()` work without instantiating the Pulse class

## API Authentication

API keys use the format `sk_live_{base64url}`. Sent as `Authorization: Bearer sk_live_...`. The HttpClient validates the prefix at construction time.

## How to Add a New API Resource

1. Create `src/resources/my-resource.ts`:
   ```typescript
   import type { HttpClient } from '../client'

   export class MyResource {
     constructor(private readonly client: HttpClient) {}

     async list(): Promise<MyType[]> {
       return this.client.request<MyType[]>('GET', '/my-resource')
     }
   }
   ```
2. Add types to `src/types.ts`
3. Add the resource to the `Pulse` class in `src/index.ts`:
   ```typescript
   public readonly myResource: MyResource
   // in constructor:
   this.myResource = new MyResource(this.client)
   ```
4. Re-export types from `src/index.ts`

## Error Handling Pattern

All API errors are mapped by `HttpClient.handleError()`:
- 401 → `PulseAuthenticationError`
- 429 → `PulseRateLimitError` (with `retryAfter` seconds)
- Other → `PulseApiError` (with `status`, `errorCode`, `message`)

All extend `PulseError extends Error`.

## Webhook Signature Verification

Pulse sends `X-Pulse-Signature: sha256={hmac_hex}` header. Verify with:
```typescript
Pulse.webhooks.verifySignature(rawBody, signatureHeader, secret)
```
Uses HMAC-SHA256 with timing-safe comparison.

## Code Style

- TypeScript strict mode
- No default exports — everything is named exports
- Interfaces for all public types (not type aliases)
- JSDoc on all public APIs with `@example` blocks
- No runtime dependencies beyond Node.js built-ins
