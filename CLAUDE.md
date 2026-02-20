# @beinfi/pulse-sdk — Claude Context

## Commands
- `npm run build` — build ESM + CJS + .d.ts via tsup
- `npm run dev` — watch mode

## Architecture
- `src/index.ts` — main `Pulse` class, all re-exports
- `src/client.ts` — `HttpClient` (fetch wrapper, auth, error mapping, `{ data }` unwrap)
- `src/types.ts` — all shared interfaces
- `src/resources/` — API resource classes (payment-links, webhooks)
- `src/webhooks/verify.ts` — HMAC-SHA256 signature verification
- `src/checkout/` — browser-only iframe checkout widget
- `src/errors.ts` — error hierarchy (PulseError > PulseApiError > Auth/RateLimit)

## Key Patterns
- Zero runtime deps. Only uses Node `crypto` for webhook verification.
- Dual ESM/CJS output via tsup.
- API key format: `sk_live_...`, sent as `Authorization: Bearer` header.
- Resources receive `HttpClient` via constructor. Add new resources the same way.
- All public APIs have JSDoc with `@example`. Maintain this when adding new code.
- Named exports only, no default exports.
- Interfaces (not type aliases) for all public types.

## Read First
1. `src/types.ts` — understand all data shapes
2. `src/client.ts` — understand how API calls work
3. `src/index.ts` — understand the public API surface
