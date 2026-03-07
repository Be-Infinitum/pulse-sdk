/**
 * Pulse SDK — AI Agent Billing Demo
 *
 * End-to-end AI agent billing demo that:
 * 1. Creates a product + meters for token-based billing
 * 2. Registers a customer with email
 * 3. Opens an ngrok tunnel and registers a webhook with Pulse
 * 4. Makes real AI calls (OpenAI + Gemini) and tracks token usage
 * 5. Generates an invoice and waits for the `invoice.created` webhook
 * 6. Sends the invoice email and waits for `payment.confirmed`
 *
 * Usage:
 *   PULSE_API_KEY=sk_live_xxx OPENAI_API_KEY=sk-xxx GOOGLE_GENERATIVE_AI_API_KEY=xxx bun run examples/ai-agent-billing.ts
 */

import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import ngrok from "@ngrok/ngrok";
import { generateText } from "ai";
import { Pulse } from "../src";

// ── Config ──────────────────────────────────────────
const API_KEY = process.env.PULSE_API_KEY;
const BASE_URL = process.env.PULSE_API_BASE_URL || "https://api.beinfi.com";
const WEBHOOK_PORT = parseInt(process.env.WEBHOOK_PORT || "9876", 10);

if (!API_KEY) {
  console.error("Set PULSE_API_KEY env var (e.g. sk_live_xxx)");
  process.exit(1);
}

const pulse = new Pulse({ apiKey: API_KEY, baseUrl: BASE_URL });

// ── Helpers ─────────────────────────────────────────
function header(text: string) {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`  ${text}`);
  console.log("=".repeat(50));
}

// ── Webhook Server ─────────────────────────────────
function startWebhookServer(secret: string, port: number) {
  const listeners = new Map<string, (payload: unknown) => void>();

  const server = Bun.serve({
    port,
    async fetch(req) {
      if (req.method !== "POST") return new Response("OK", { status: 200 });

      const rawBody = await req.text();
      const signature = req.headers.get("x-pulse-signature") || "";
      const event = req.headers.get("x-pulse-event") || "";

      const valid = Pulse.webhooks.verifySignature(rawBody, signature, secret);
      if (!valid) return new Response("Invalid signature", { status: 401 });

      const payload = JSON.parse(rawBody);
      const listener = listeners.get(event);
      if (listener) listener(payload);

      return new Response("OK", { status: 200 });
    },
  });

  return {
    server,
    waitForEvent(eventType: string, timeoutMs = 30_000): Promise<unknown> {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          listeners.delete(eventType);
          reject(new Error(`Timeout waiting for ${eventType}`));
        }, timeoutMs);

        listeners.set(eventType, (payload) => {
          clearTimeout(timer);
          listeners.delete(eventType);
          resolve(payload);
        });
      });
    },
  };
}

// ── Main ────────────────────────────────────────────
async function main() {
  header("1. Create Product");

  const product = await pulse.metering.createProduct({
    name: "AI Agent Pro",
    type: "agent",
    pricingModel: "usage",
    billingCycle: "monthly",
    description: "GPT-powered assistant with token-based billing",
  });
  console.log(`Product created: ${product.id} (${product.name})`);

  // ── Create Meters ─────────────────────────────────
  header("2. Create Meters");

  const tokenMeter = await pulse.metering.createMeter(product.id, {
    name: "tokens",
    displayName: "AI Tokens",
    unit: "token",
    unitPrice: "0.0001", // $0.0001 per token
  });
  console.log(
    `Meter created: ${tokenMeter.id} (${tokenMeter.displayName}) — $${tokenMeter.unitPrice}/token`,
  );

  const requestMeter = await pulse.metering.createMeter(product.id, {
    name: "requests",
    displayName: "API Requests",
    unit: "request",
    unitPrice: "0.005", // $0.005 per request
  });
  console.log(
    `Meter created: ${requestMeter.id} (${requestMeter.displayName}) — $${requestMeter.unitPrice}/req`,
  );

  // ── Register Customer ─────────────────────────────
  header("3. Register Customer");

  const customerEmail = process.env.CUSTOMER_EMAIL || "demo@example.com";
  const customer = await pulse.metering.createCustomer(product.id, {
    externalId: "customer_001",
    name: "Acme Corp",
    email: customerEmail,
  });
  console.log(`Customer registered: ${customer.externalId} (${customer.name})`);
  console.log(`Invoice will be sent to: ${customerEmail}`);

  // ── Start Webhook Server ─────────────────────────
  header("4. Start Webhook Listener");

  const listener = await ngrok.forward({ addr: WEBHOOK_PORT, authtoken_from_env: true });
  const tunnelUrl = listener.url()!;
  activeTunnel = listener;
  console.log(`Tunnel open: ${tunnelUrl} -> localhost:${WEBHOOK_PORT}`);

  const webhook = await pulse.webhooks.create({
    url: tunnelUrl,
    events: ["invoice.created", "payment.confirmed"],
  });
  console.log(`Webhook registered: ${webhook.id}`);
  console.log(`  Events: invoice.created, payment.confirmed`);

  const { server: webhookServer, waitForEvent } = startWebhookServer(webhook.secret, WEBHOOK_PORT);
  console.log(`Webhook server listening on port ${WEBHOOK_PORT}`);

  // ── AI Agent Usage (real calls) ──────────────────
  header("5. AI Agent Usage");

  const prompts = [
    {
      prompt: "Summarize the benefits of serverless architecture in 2 sentences.",
      model: openai("gpt-4o-mini"),
      label: "gpt-4o-mini",
    },
    {
      prompt: "Write a one-paragraph marketing copy for a fintech API platform.",
      model: google("gemini-2.0-flash"),
      label: "gemini-2.0-flash",
    },
    {
      prompt: 'Translate to Portuguese: "Usage-based billing lets you pay only for what you use."',
      model: openai("gpt-4o-mini"),
      label: "gpt-4o-mini",
    },
    {
      prompt: "Explain the difference between REST and GraphQL in 3 bullet points.",
      model: google("gemini-2.0-flash"),
      label: "gemini-2.0-flash",
    },
    {
      prompt: "What is the capital of Brazil?",
      model: openai("gpt-4o-mini"),
      label: "gpt-4o-mini",
    },
  ];

  const session = pulse.metering.session("customer_001");
  let totalTokens = 0;

  for (const { prompt, model, label } of prompts) {
    console.log(`\n  -> [${label}] "${prompt}"`);

    const result = await generateText({ model, prompt });

    const tokens = result.usage.totalTokens;
    if (tokens) {
      totalTokens += tokens;
    }
    console.log(`     Response (${tokens} tokens): ${result.text.slice(0, 120)}...`);

    session.track(tokenMeter.id, tokens ?? 0, { model: label });
    session.track(requestMeter.id, 1, { model: label });
  }

  const batchResult = await session.end();
  console.log(
    `\nBatch sent: ${batchResult.accepted} events accepted, ${batchResult.failed} failed`,
  );
  console.log(`Total tokens used: ${totalTokens}`);

  // ── Check Usage ───────────────────────────────────
  header("6. Check Usage");

  const usage = (await pulse.metering.getUsage({ customerId: "customer_001" })) as any;
  // HttpClient unwraps { data: [...] } → the array itself, or it may come as { data: [...] }
  const usageItems = Array.isArray(usage) ? usage : (usage?.data ?? []);
  for (const item of usageItems) {
    console.log(`  ${item.meterName}: ${item.totalValue} ${item.unit}s = $${item.totalAmount}`);
  }

  const totalCost = usageItems.reduce(
    (sum: number, item: any) => sum + parseFloat(item.totalAmount),
    0,
  );
  console.log(`\n  Total: $${totalCost.toFixed(2)}`);

  // ── Generate Invoice ──────────────────────────────
  header("7. Generate Invoice");

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const periodEnd = now.toISOString();

  console.log(`Period: ${periodStart.split("T")[0]} to ${periodEnd.split("T")[0]}`);

  const invoice = await pulse.billing.generateInvoice(product.id, {
    customerId: "customer_001",
    periodStart,
    periodEnd,
  });

  console.log(`Invoice created: ${invoice.invoiceNumber}`);
  console.log(`  Status: ${invoice.status}`);
  console.log(`  Total: $${invoice.total}`);
  if (invoice.paymentLinkId) {
    console.log(`  Payment link: ${invoice.paymentLinkId}`);
  }

  // ── Wait for Webhook ─────────────────────────────
  header("8. Wait for invoice.created Webhook");

  try {
    const eventPayload = await waitForEvent("invoice.created", 30_000);
    console.log("Webhook received! Payload:");
    console.log(JSON.stringify(eventPayload, null, 2));
  } catch {
    console.log("Timeout: invoice.created webhook not received within 30s (continuing anyway)");
  }

  // ── Send Invoice Email ────────────────────────────
  header("9. Send Invoice Email");

  if (invoice.paymentLinkId) {
    const sendResult = await pulse.billing.sendInvoice(product.id, invoice.id);
    console.log(`Invoice email sent to ${customerEmail}`);
    console.log(sendResult);
  } else {
    console.log("No payment link generated — email not sent (check backend logs)");
  }

  // ── Wait for Payment ────────────────────────────
  header("10. Wait for payment.confirmed Webhook");

  console.log("Waiting for customer to pay the invoice...");
  try {
    const paymentPayload = await waitForEvent("payment.confirmed", 300_000);
    console.log("Payment confirmed! Payload:");
    console.log(JSON.stringify(paymentPayload, null, 2));
  } catch {
    console.log("Timeout: payment.confirmed webhook not received within 5min (continuing anyway)");
  }

  // ── Cleanup ─────────────────────────────────────
  header("11. Cleanup");

  await pulse.webhooks.delete(webhook.id);
  console.log(`Webhook deleted: ${webhook.id}`);
  webhookServer.stop();
  console.log("Webhook server stopped");
  await ngrok.disconnect();
  console.log("Tunnel closed");

  // ── Done ──────────────────────────────────────────
  header("Done!");
  console.log(`
Summary:
  Product:    ${product.name} (${product.id})
  Customer:   ${customer.name} <${customerEmail}>
  Usage:      ${prompts.length} AI interactions
  Tokens:     ${totalTokens} total
  Invoice:    ${invoice.invoiceNumber} — $${invoice.total}
  Email:      ${invoice.paymentLinkId ? "Sent" : "Not sent (no payment link)"}
  Webhook:    Received & cleaned up
`);
}

// ── Graceful shutdown ──────────────────────────────
let cleanedUp = false;
let activeTunnel: ngrok.Listener | null = null;

async function cleanup() {
  if (cleanedUp) return;
  cleanedUp = true;
  console.log("\nCleaning up...");

  try {
    const webhooks = await pulse.webhooks.list();
    for (const wh of webhooks) {
      await pulse.webhooks.delete(wh.id);
      console.log(`Webhook deleted: ${wh.id}`);
    }
  } catch {
    // best-effort cleanup
  }

  if (activeTunnel) {
    await ngrok.disconnect();
    console.log("Tunnel closed");
  }
}

process.on("SIGINT", async () => {
  await cleanup();
  process.exit(0);
});

main().catch(async (err) => {
  console.error("Script failed:", err);
  await cleanup();
  process.exit(1);
});
