/**
 * Setup script — creates a product and meters via the Pulse SDK.
 *
 * Usage:
 *   cp .env.example .env   # fill PULSE_API_KEY + PULSE_BASE_URL
 *   bun run setup
 */

import { Pulse } from "@infi/pulse-sdk";

const apiKey = process.env.PULSE_API_KEY;
const baseUrl = process.env.PULSE_BASE_URL;

if (!apiKey) {
  console.error("Missing PULSE_API_KEY in .env");
  process.exit(1);
}

const pulse = new Pulse({ apiKey, baseUrl });

console.log("Creating product...");
const product = await pulse.metering.createProduct({
  name: "AI Agent",
  description: "Usage-based billing for AI agent requests and tokens",
});
console.log(`  Product created: ${product.id} (${product.name})`);

console.log("Creating meters...");

const requestsMeter = await pulse.metering.createMeter(product.id, {
  name: "requests",
  displayName: "API Requests",
  unit: "request",
  unitPrice: "0.01",
});
console.log(`  Meter created: ${requestsMeter.id} (${requestsMeter.name})`);

const tokensMeter = await pulse.metering.createMeter(product.id, {
  name: "tokens",
  displayName: "AI Tokens",
  unit: "token",
  unitPrice: "0.0001",
});
console.log(`  Meter created: ${tokensMeter.id} (${tokensMeter.name})`);

console.log("\n--- Add these to your .env ---\n");
console.log(`PRODUCT_ID=${product.id}`);
console.log(`REQUESTS_METER_ID=${requestsMeter.id}`);
console.log(`TOKENS_METER_ID=${tokensMeter.id}`);
console.log("\nThen run: bun run server");
