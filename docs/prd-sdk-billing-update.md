# PRD: SDK & Docs — Products & Billing Update

## Contexto

O backend agora suporta:

- **4 pricing models**: `subscription`, `one_time`, `usage`, `prepaid`
- **Ciclo annual**: substitui `quarterly` (ciclos validos: `weekly`, `monthly`, `annual`)
- **Meter units restritos**: `token`, `request`, `unit`
- **Prepaid credits**: ativar creditos, debitar no trackEvent, alerta 20%, bloqueio em 0
- **Endpoints de credito**: `GET/POST /products/:productId/customers/:customerId/credit`
- **Subscriptions API**: criar, listar, pausar, resumir, cancelar
- **Invoices API**: gerar, enviar por email, listar

O SDK (`@beinfi/pulse-sdk` — TS e Python) precisa ser atualizado para expor essas features.

---

## Estado Atual do SDK

### O que ja existe:

- `pulse.metering.track()` / `trackBatch()` / `session()`
- `pulse.metering.createProduct()` — aceita apenas `{ name, description }`
- `pulse.metering.createMeter()` — aceita `{ name, displayName, unit, unitPrice }`
- `pulse.metering.createCustomer()` — aceita `{ externalId, name, email, metadata }`
- `pulse.metering.getUsage()` / `getCustomerUsage()`
- `pulse.metering.listProducts()`
- Types: `MeteringProduct`, `ProductCustomer`, `Meter`, `CreateProductParams`, etc.

### O que NAO existe:

- `pricingModel`, `type`, `price`, `billingCycle`, `currency` em `CreateProductParams`
- Campos de credito em `ProductCustomer`
- Metodos de billing: invoices, subscriptions, credits
- Error type `CREDIT_EXHAUSTED` (HTTP 402)
- `createProduct` no SDK so aceita `{ name, description }` — nao envia type, pricingModel, price, billingCycle

---

## Arquivos a Alterar

### TypeScript SDK (`/pulse-sdk/src/`)

| Arquivo                     | Mudanca                                                |
| --------------------------- | ------------------------------------------------------ |
| `src/types.ts`              | Atualizar interfaces existentes + adicionar novas      |
| `src/resources/metering.ts` | Atualizar `createProduct`, adicionar metodos de credit |
| `src/resources/billing.ts`  | **NOVO** — subscriptions + invoices                    |
| `src/index.ts`              | Expor `BillingResource`, novos types                   |
| `src/errors.ts`             | Adicionar `PulseCreditExhaustedError`                  |

### Python SDK (`/pulse-sdk/python/src/pulse_sdk/`)

| Arquivo       | Mudanca                                              |
| ------------- | ---------------------------------------------------- |
| `types.py`    | Atualizar dataclasses + adicionar novas              |
| `metering.py` | Atualizar `create_product`, adicionar credit methods |
| `billing.py`  | **NOVO** — subscriptions + invoices                  |
| `client.py`   | Expor `billing` resource                             |
| `errors.py`   | Adicionar `CreditExhaustedError`                     |

### Docs (`/pulse-sdk/docs/`)

| Arquivo              | Mudanca                                          |
| -------------------- | ------------------------------------------------ |
| `docs/quickstart.md` | Adicionar secao de billing/subscriptions/prepaid |
| `docs/billing.md`    | **NOVO** — guia completo de billing              |
| `docs/prepaid.md`    | **NOVO** — guia de creditos prepaid              |

### Examples (`/pulse-sdk/examples/`)

| Arquivo                            | Mudanca                                              |
| ---------------------------------- | ---------------------------------------------------- |
| `examples/ai-agent-billing.ts`     | Atualizar para usar `createProduct` com pricingModel |
| `examples/prepaid-credits.ts`      | **NOVO** — demo de prepaid pack + debito             |
| `examples/subscription-billing.ts` | **NOVO** — demo de subscription lifecycle            |

### Frontend Docs Page (`/pulse/src/routes/`)

| Arquivo                          | Mudanca                                      |
| -------------------------------- | -------------------------------------------- |
| Dashboard docs page (se existir) | Adicionar code snippets para billing/prepaid |

---

## Tasks Detalhadas

### Task 1: Atualizar `types.ts` (TypeScript)

**Alterar `CreateProductParams`:**

```typescript
export interface CreateProductParams {
  name: string;
  type?: "agent" | "item";
  description?: string;
  pricingModel?: "subscription" | "one_time" | "usage" | "prepaid";
  price?: string;
  billingCycle?: "weekly" | "monthly" | "annual";
  currency?: string;
}
```

**Alterar `MeteringProduct`:**

```typescript
export interface MeteringProduct {
  id: string;
  name: string;
  type: string;
  description?: string;
  pricingModel: string;
  price?: string | null;
  billingCycle?: string | null;
  currency: string;
  status: string;
  meters: Array<{
    id: string;
    name: string;
    displayName: string;
    unit: string;
    unitPrice: string;
  }>;
}
```

**Alterar `CreateMeterParams`:**

```typescript
export interface CreateMeterParams {
  name: string;
  displayName: string;
  unit: "token" | "request" | "unit";
  unitPrice: string;
}
```

**Alterar `ProductCustomer`:**

```typescript
export interface ProductCustomer {
  id: string;
  externalId: string;
  name?: string | null;
  email?: string | null;
  creditBalance?: string | null;
  creditTotal?: string | null;
  creditAlertSent?: boolean;
  createdAt: string;
}
```

**Adicionar novos types:**

```typescript
// ── Credits ──
export interface CreditBalance {
  creditBalance: string | null;
  creditTotal: string | null;
  creditAlertSent: boolean;
}

export interface ActivateCreditParams {
  amount: string;
}

// ── Subscriptions ──
export interface Subscription {
  id: string;
  status: string; // 'active' | 'paused' | 'past_due' | 'cancelled' | 'expired'
  billingCycle: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextBillingDate: string;
  createdAt: string;
  productCustomer: {
    id: string;
    externalId: string;
    name?: string | null;
    email?: string | null;
  };
}

export interface ListSubscriptionsParams {
  status?: string;
}

export interface SubscriptionAction {
  action: "pause" | "resume" | "cancel";
}

// ── Invoices ──
export interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  subtotal: string;
  total: string;
  currency: string;
  paymentLinkId?: string | null;
  paidAt?: string | null;
  dueDate?: string | null;
  createdAt: string;
  lineItems: Array<{
    id: string;
    type?: string;
    meterName: string;
    description: string;
    quantity: string;
    unitPrice: string;
    amount: string;
  }>;
  productCustomer: {
    id: string;
    externalId: string;
    name?: string | null;
  };
}

export interface GenerateInvoiceParams {
  customerId: string;
  periodStart: string;
  periodEnd: string;
}
```

---

### Task 2: Atualizar `resources/metering.ts` (TypeScript)

**2a. Atualizar `createProduct()`:**
O metodo ja existe mas so envia `{ name, description }`. Precisa enviar todos os campos:

```typescript
async createProduct(data: CreateProductParams): Promise<MeteringProduct> {
  return this.client.request<MeteringProduct>(
    'POST',
    '/metering/products',
    {
      body: {
        name: data.name,
        type: data.type,
        description: data.description,
        pricingModel: data.pricingModel,
        price: data.price,
        billingCycle: data.billingCycle,
        currency: data.currency,
      },
    }
  )
}
```

**2b. Adicionar metodos de credit:**

```typescript
async getCreditBalance(
  productId: string,
  customerId: string
): Promise<CreditBalance> {
  return this.client.request<CreditBalance>(
    'GET',
    `/metering/products/${productId}/customers/${customerId}/credit`
  )
}

async activateCredit(
  productId: string,
  customerId: string,
  amount: string
): Promise<CreditBalance> {
  return this.client.request<CreditBalance>(
    'POST',
    `/metering/products/${productId}/customers/${customerId}/credit`,
    { body: { amount } }
  )
}
```

Nota: os endpoints de credit estao em `/api/v1/billing/:productId/customers/:customerId/credit` no backend. Verificar se o SDK usa `/metering/` ou `/billing/` como prefixo — o HttpClient pode ja ter um basePath. Ajustar o path conforme a rota real do backend.

---

### Task 3: Criar `resources/billing.ts` (TypeScript) — NOVO

```typescript
export class BillingResource {
  constructor(private readonly client: HttpClient) {}

  // ── Subscriptions ──
  async listSubscriptions(
    productId: string,
    params?: ListSubscriptionsParams,
  ): Promise<{ items: Subscription[]; total: number }>;

  async updateSubscription(
    productId: string,
    subscriptionId: string,
    action: "pause" | "resume" | "cancel",
  ): Promise<Subscription>;

  // ── Invoices ──
  async listInvoices(productId: string): Promise<Invoice[]>;

  async generateInvoice(productId: string, data: GenerateInvoiceParams): Promise<Invoice>;

  async sendInvoice(
    productId: string,
    invoiceId: string,
  ): Promise<{ sent: boolean; invoiceId: string }>;
}
```

O `ai-agent-billing.ts` example ja usa `billingRequest()` como workaround para invoices — essa task elimina essa necessidade.

---

### Task 4: Atualizar `index.ts` (TypeScript)

```typescript
import { BillingResource } from "./resources/billing";

export class Pulse {
  public readonly paymentLinks: PaymentLinksResource;
  public readonly webhooks: WebhooksResource;
  public readonly metering: MeteringResource;
  public readonly billing: BillingResource; // NOVO

  constructor(config: string | PulseConfig) {
    // ...
    this.billing = new BillingResource(this.client);
  }
}

// Adicionar exports:
export type {
  // ... existentes ...
  Subscription,
  ListSubscriptionsParams,
  Invoice,
  GenerateInvoiceParams,
  CreditBalance,
  ActivateCreditParams,
} from "./types";
```

---

### Task 5: Atualizar `errors.ts` (TypeScript)

Adicionar erro especifico para credito esgotado:

```typescript
export class PulseCreditExhaustedError extends PulseApiError {
  constructor(message: string) {
    super(402, "credit_exhausted", message);
    this.name = "PulseCreditExhaustedError";
  }
}
```

No client HTTP, detectar status 402 + errorCode `credit_exhausted` e lancar essa classe.

---

### Task 6: Atualizar Python SDK

**6a. `types.py` — mesmas mudancas da Task 1:**

- `MeteringProduct`: adicionar `type`, `pricing_model`, `price`, `billing_cycle`, `currency`
- `ProductCustomer`: adicionar `credit_balance`, `credit_total`, `credit_alert_sent`
- Adicionar: `CreditBalance`, `Subscription`, `Invoice`, `GenerateInvoiceParams`

**6b. `metering.py` — mesmas mudancas da Task 2:**

- Atualizar `create_product()` para aceitar e enviar todos os campos (inclusive pricingModel como `pricing_model` param → `pricingModel` no JSON)
- Adicionar `get_credit_balance()` e `activate_credit()`
- Fazer o mesmo no `AsyncMeteringResource`

**6c. `billing.py` — NOVO, equivalente a Task 3:**

- `BillingResource` e `AsyncBillingResource`
- Metodos: `list_subscriptions`, `update_subscription`, `list_invoices`, `generate_invoice`, `send_invoice`

**6d. `client.py`:**

- Instanciar `self.billing = BillingResource(self._client)`

**6e. `errors.py`:**

- Adicionar `CreditExhaustedError(PulseApiError)`

---

### Task 7: Atualizar Docs

**7a. `docs/quickstart.md` — Adicionar secoes:**

Apos a secao 8 (Error Handling), adicionar:

```markdown
## 9. Usage-Based Billing (Products)

### Create a Product with Pricing Model

### Track Usage and Generate Invoices

### Manage Subscriptions
```

**7b. `docs/billing.md` — NOVO:**

Guia completo cobrindo:

1. Pricing Models (subscription, one_time, usage, prepaid) — quando usar cada
2. Criar produto com cada modelo
3. Criar meters (unit types por product type)
4. Billing cycles (weekly, monthly, annual)
5. Subscription lifecycle (create, pause, resume, cancel, renewal)
6. Invoice generation and sending
7. Error handling (CREDIT_EXHAUSTED)

**7c. `docs/prepaid.md` — NOVO:**

Guia especifico de prepaid:

1. Criar produto prepaid
2. Criar customer
3. Ativar creditos (`activateCredit`)
4. Trackear uso (debito automatico)
5. Alerta de 20% (automatico via email)
6. Bloqueio em 0 (trackEvent retorna 402)
7. Recarregar creditos (acumulativo)
8. Consultar saldo (`getCreditBalance`)

---

### Task 8: Atualizar Examples

**8a. `examples/ai-agent-billing.ts`:**

- Remover `billingRequest()` workaround
- Usar `pulse.billing.generateInvoice()` e `pulse.billing.sendInvoice()`
- Atualizar `createProduct()` para incluir `type: 'agent'` e `pricingModel: 'usage'`

**8b. `examples/prepaid-credits.ts` — NOVO:**

```typescript
// Demo: Prepaid credit pack for an AI agent
// 1. Create prepaid product
// 2. Create customer + activate credits
// 3. Track usage (auto-debit)
// 4. Check balance
// 5. Track until credit exhausted (402)
// 6. Recharge credits
```

**8c. `examples/subscription-billing.ts` — NOVO:**

```typescript
// Demo: Subscription product with billing
// 1. Create subscription product (monthly, $29/mo)
// 2. Create customer
// 3. List subscriptions
// 4. Generate invoice
// 5. Send invoice email
// 6. Pause/resume subscription
```

---

### Task 9: Atualizar Frontend Docs Page

O quickstart code no product detail (`dashboard.products.$productId.index.tsx`) ja mostra exemplos de SDK. Verificar se precisa atualizar os snippets para incluir `pricingModel` no `createProduct` call.

Atual:

```typescript
const pulse = new Pulse('sk_live_your_api_key')
const customer = await pulse.metering.customers.create(...)
await pulse.metering.track(...)
```

Nao precisa de mudanca — o quickstart no frontend mostra apenas tracking, que nao mudou.

---

## Ordem de Execucao

```
Task 1 (types.ts) ──────────────────────────────────┐
Task 6a (Python types.py) ──────────────────────────┤
                                                     ├→ Task 2 (metering.ts)
                                                     ├→ Task 3 (billing.ts) ──┐
                                                     ├→ Task 5 (errors.ts)    │
                                                     ├→ Task 6b-e (Python)    │
                                                     │                        │
                                                     └→ Task 4 (index.ts) ←───┘
                                                          │
                                                          ├→ Task 7 (docs)
                                                          └→ Task 8 (examples)
```

Tasks 1 e 6a sao independentes e podem ser paralelas.
Tasks 2, 3, 5, 6b-e dependem dos types.
Tasks 7 e 8 dependem de tudo acima.
Task 9 e independente.

---

## Verificacao

- [ ] `bun test` nos testes do SDK passa
- [ ] `pytest` nos testes Python passa
- [ ] `bun run examples/ai-agent-billing.ts` funciona sem `billingRequest()` workaround
- [ ] `bun run examples/prepaid-credits.ts` demonstra ciclo completo de creditos
- [ ] `bun run examples/subscription-billing.ts` demonstra lifecycle de subscription
- [ ] Todos os novos types sao exportados no `index.ts`
- [ ] `pulse.billing.*` esta acessivel na instancia
- [ ] `pulse.metering.createProduct({ pricingModel: 'prepaid', ... })` funciona
- [ ] `pulse.metering.activateCredit(...)` funciona
- [ ] `PulseCreditExhaustedError` e lancado em track com saldo 0

---

## Breaking Changes

**Nenhum breaking change.** Todas as mudancas sao aditivas:

- `CreateProductParams` ganha campos opcionais
- `MeteringProduct` ganha campos novos (sempre presentes na API, backward compat)
- `ProductCustomer` ganha campos opcionais de credito
- `pulse.billing` e um novo resource (nao afeta existentes)
- `CreateMeterParams.unit` fica mais restrito no type, mas o runtime ja validava no backend

A unica consideracao e que `CreateMeterParams.unit` muda de `string` para union type — isso pode quebrar codigo que passava units arbitrarios, mas o backend ja rejeitava units invalidos, entao na pratica nao e breaking.
