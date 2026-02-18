import type { LanguageModelV3Middleware } from '@ai-sdk/provider'
import type { Pulse } from './index'

export interface PulseMiddlewareConfig {
  /** Pulse SDK instance (already configured with API key) */
  pulse: Pulse
  /** Customer ID — string or function that resolves at call time */
  customerId: string | (() => string | Promise<string>)
  /** Meter IDs for input and output tokens */
  meters: {
    input: string
    output: string
  }
  /** Optional metadata to attach to every event */
  metadata?: Record<string, unknown>
}

export function pulseMiddleware(
  config: PulseMiddlewareConfig
): LanguageModelV3Middleware {
  const resolveCustomerId = async () =>
    typeof config.customerId === 'function'
      ? await config.customerId()
      : config.customerId

  const trackUsage = async (
    inputTokens: number | undefined,
    outputTokens: number | undefined
  ) => {
    const customerId = await resolveCustomerId()
    const session = config.pulse.metering.session(customerId)

    if (inputTokens != null && inputTokens > 0) {
      session.track(config.meters.input, inputTokens, config.metadata)
    }
    if (outputTokens != null && outputTokens > 0) {
      session.track(config.meters.output, outputTokens, config.metadata)
    }

    await session.end()
  }

  return {
    specificationVersion: 'v3',

    // Non-streaming (generateText, generateObject)
    wrapGenerate: async ({ doGenerate }) => {
      const result = await doGenerate()

      // Fire-and-forget — don't block the response
      trackUsage(
        result.usage.inputTokens.total,
        result.usage.outputTokens.total
      ).catch(() => {})

      return result
    },

    // Streaming (streamText, streamObject)
    wrapStream: async ({ doStream }) => {
      const { stream, ...rest } = await doStream()

      const transformStream = new TransformStream({
        transform(chunk, controller) {
          if (chunk.type === 'finish') {
            trackUsage(
              chunk.usage.inputTokens.total,
              chunk.usage.outputTokens.total
            ).catch(() => {})
          }
          controller.enqueue(chunk)
        },
      })

      return { stream: stream.pipeThrough(transformStream), ...rest }
    },
  }
}
