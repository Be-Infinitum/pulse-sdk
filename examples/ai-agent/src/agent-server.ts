/**
 * AI Agent server — routes chat requests to OpenAI or Gemini
 * using the Vercel AI SDK with middleware for Pulse metering.
 *
 * Usage:
 *   bun run server
 */

import { Pulse } from "@infi/pulse-sdk";
import { generateText, type Experimental_LanguageModelMiddleware } from "ai";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";

// --------------- env ---------------

const PULSE_API_KEY = process.env.PULSE_API_KEY!;
const PULSE_BASE_URL = process.env.PULSE_BASE_URL;
const REQUESTS_METER_ID = process.env.REQUESTS_METER_ID!;
const TOKENS_METER_ID = process.env.TOKENS_METER_ID!;
const PORT = Number(process.env.PORT || 4000);

for (const [k, v] of Object.entries({
  PULSE_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  REQUESTS_METER_ID,
  TOKENS_METER_ID,
})) {
  if (!v) {
    console.error(`Missing ${k} in .env`);
    process.exit(1);
  }
}

// --------------- Pulse client ---------------

const pulse = new Pulse({ apiKey: PULSE_API_KEY, baseUrl: PULSE_BASE_URL });

// --------------- Pulse metering middleware ---------------

function pulseMetering(customerId: string): Experimental_LanguageModelMiddleware {
  return {
    wrapGenerate: async ({ doGenerate, params }) => {
      const result = await doGenerate();

      const provider = params.model?.provider ?? "unknown";
      const model = params.model?.modelId ?? "unknown";
      const totalTokens =
        (result.usage?.promptTokens ?? 0) +
        (result.usage?.completionTokens ?? 0);

      const session = pulse.metering.session(customerId);
      session.track(REQUESTS_METER_ID, 1, { provider, model });
      session.track(TOKENS_METER_ID, totalTokens, { provider, model });
      await session.end();

      return result;
    },
  };
}

// --------------- models ---------------

const models = {
  openai: openai("gpt-4o-mini"),
  gemini: google("gemini-2.0-flash"),
} as const;

// --------------- server ---------------

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/health" && req.method === "GET") {
      return Response.json({ status: "ok" });
    }

    if (url.pathname === "/chat" && req.method === "POST") {
      const body = (await req.json()) as {
        prompt?: string;
        provider?: string;
        customerId?: string;
      };

      if (!body.prompt || !body.provider || !body.customerId) {
        return Response.json(
          { error: "prompt, provider, and customerId are required" },
          { status: 400 }
        );
      }

      const provider = body.provider as "openai" | "gemini";
      if (provider !== "openai" && provider !== "gemini") {
        return Response.json(
          { error: 'provider must be "openai" or "gemini"' },
          { status: 400 }
        );
      }

      try {
        const result = await generateText({
          model: models[provider],
          prompt: body.prompt,
          experimental_telemetry: { isEnabled: false },
          experimental_providerMetadata: {},
          _internal: {
            currentDate: () => new Date(),
          },
          middleware: pulseMetering(body.customerId),
        } as any);

        const totalTokens =
          (result.usage?.promptTokens ?? 0) +
          (result.usage?.completionTokens ?? 0);

        return Response.json({
          response: result.text,
          provider,
          model: provider === "openai" ? "gpt-4o-mini" : "gemini-2.0-flash",
          tokens: totalTokens,
          meteredAt: new Date().toISOString(),
        });
      } catch (err: any) {
        console.error(`[${provider}] Error:`, err.message);
        return Response.json(
          { error: err.message ?? "Provider call failed" },
          { status: 502 }
        );
      }
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  },
});

console.log(`AI Agent server running on http://localhost:${server.port}`);
console.log("  POST /chat  — { prompt, provider, customerId }");
console.log("  GET  /health");
