/**
 * Test client — sends requests to the AI Agent server and queries usage.
 *
 * Usage:
 *   bun run test-client
 */

import { Pulse } from "@beinfi/pulse-sdk";

const PORT = Number(process.env.PORT || 4000);
const BASE = `http://localhost:${PORT}`;
const CUSTOMER_ID = "test-user-001";

const PULSE_API_KEY = process.env.PULSE_API_KEY!;
const PULSE_BASE_URL = process.env.PULSE_BASE_URL;

if (!PULSE_API_KEY) {
  console.error("Missing PULSE_API_KEY in .env");
  process.exit(1);
}

const pulse = new Pulse({ apiKey: PULSE_API_KEY, baseUrl: PULSE_BASE_URL });

// --------------- helpers ---------------

async function chat(
  prompt: string,
  provider: "openai" | "gemini"
): Promise<void> {
  console.log(`\n[${provider.toUpperCase()}] "${prompt}"`);

  const res = await fetch(`${BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, provider, customerId: CUSTOMER_ID }),
  });

  if (!res.ok) {
    const err = await res.json();
    console.error(`  Error (${res.status}):`, err);
    return;
  }

  const data = (await res.json()) as {
    response: string;
    provider: string;
    model: string;
    tokens: number;
    meteredAt: string;
  };

  console.log(`  Model: ${data.model}`);
  console.log(`  Tokens: ${data.tokens}`);
  console.log(
    `  Response: ${data.response.slice(0, 120)}${data.response.length > 120 ? "..." : ""}`
  );
  console.log(`  Metered at: ${data.meteredAt}`);
}

// --------------- main ---------------

console.log("=== AI Agent Test Client ===\n");

await chat("What is Rust programming language?", "openai");
await chat("Explain WebAssembly in 2 sentences", "gemini");
await chat("What is a monad?", "openai");

console.log("\n--- Waiting 2s for metering to process... ---");
await new Promise((r) => setTimeout(r, 2000));

console.log("\n=== Usage Report ===\n");

try {
  const usage = await pulse.metering.getUsage({ customerId: CUSTOMER_ID });

  if (usage.data.length === 0) {
    console.log("  No usage data yet (may take a moment to appear)");
  } else {
    console.log(
      "  Meter            | Total Value | Total Amount | Events"
    );
    console.log(
      "  -----------------+-------------+--------------+-------"
    );
    for (const item of usage.data) {
      console.log(
        `  ${item.meterName.padEnd(17)}| ${item.totalValue.padStart(11)} | $${item.totalAmount.padStart(11)} | ${item.eventCount}`
      );
    }
  }
} catch (err: any) {
  console.error("  Failed to fetch usage:", err.message);
}

console.log("\nCheck Pulse dashboard for full usage data.");
