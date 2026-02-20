import { describe, it, expect, vi, beforeEach } from 'vitest'
import { pulseMiddleware } from '../ai'
import type { Pulse } from '../index'

function createMockPulse() {
  const trackBatchFn = vi.fn().mockResolvedValue({ accepted: 0, failed: 0, results: [] })

  // We need a real-ish session that records track calls and sends them via trackBatch
  const sessionEvents: Array<{ meterId: string; value: number | string; metadata?: Record<string, unknown> }> = []

  const mockMeteringResource = {
    session: vi.fn((customerId: string) => {
      sessionEvents.length = 0
      return {
        track(meterId: string, value: number | string, metadata?: Record<string, unknown>) {
          sessionEvents.push({ meterId, value, metadata })
          return this
        },
        end: vi.fn(async () => {
          if (sessionEvents.length === 0) return { accepted: 0, failed: 0, results: [] }
          const result = await trackBatchFn(sessionEvents.slice())
          sessionEvents.length = 0
          return result
        }),
      }
    }),
  }

  return {
    pulse: { metering: mockMeteringResource } as unknown as Pulse,
    trackBatchFn,
    sessionFn: mockMeteringResource.session,
  }
}

describe('pulseMiddleware', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns a middleware object with specificationVersion v3', () => {
    const { pulse } = createMockPulse()
    const mw = pulseMiddleware({
      pulse,
      customerId: 'user_1',
      meters: { input: 'input_tokens', output: 'output_tokens' },
    })

    expect(mw.specificationVersion).toBe('v3')
    expect(typeof mw.wrapGenerate).toBe('function')
    expect(typeof mw.wrapStream).toBe('function')
  })

  describe('wrapGenerate', () => {
    it('tracks usage with input and output tokens', async () => {
      const { pulse, sessionFn } = createMockPulse()
      const mw = pulseMiddleware({
        pulse,
        customerId: 'user_1',
        meters: { input: 'input_tokens', output: 'output_tokens' },
      })

      const mockResult = {
        usage: {
          inputTokens: { total: 100 },
          outputTokens: { total: 50 },
        },
      }

      await mw.wrapGenerate!({
        doGenerate: vi.fn().mockResolvedValue(mockResult),
      } as any)

      // Wait for fire-and-forget
      await new Promise((r) => setTimeout(r, 10))

      expect(sessionFn).toHaveBeenCalledWith('user_1')
    })

    it('returns the original result', async () => {
      const { pulse } = createMockPulse()
      const mw = pulseMiddleware({
        pulse,
        customerId: 'user_1',
        meters: { input: 'in', output: 'out' },
      })

      const mockResult = {
        usage: { inputTokens: { total: 10 }, outputTokens: { total: 5 } },
        text: 'hello',
      }

      const result = await mw.wrapGenerate!({
        doGenerate: vi.fn().mockResolvedValue(mockResult),
      } as any)

      expect(result).toBe(mockResult)
    })

    it('resolves customerId from string', async () => {
      const { pulse, sessionFn } = createMockPulse()
      const mw = pulseMiddleware({
        pulse,
        customerId: 'static_user',
        meters: { input: 'in', output: 'out' },
      })

      await mw.wrapGenerate!({
        doGenerate: vi.fn().mockResolvedValue({
          usage: { inputTokens: { total: 1 }, outputTokens: { total: 1 } },
        }),
      } as any)

      await new Promise((r) => setTimeout(r, 10))
      expect(sessionFn).toHaveBeenCalledWith('static_user')
    })

    it('resolves customerId from sync function', async () => {
      const { pulse, sessionFn } = createMockPulse()
      const mw = pulseMiddleware({
        pulse,
        customerId: () => 'dynamic_user',
        meters: { input: 'in', output: 'out' },
      })

      await mw.wrapGenerate!({
        doGenerate: vi.fn().mockResolvedValue({
          usage: { inputTokens: { total: 1 }, outputTokens: { total: 1 } },
        }),
      } as any)

      await new Promise((r) => setTimeout(r, 10))
      expect(sessionFn).toHaveBeenCalledWith('dynamic_user')
    })

    it('resolves customerId from async function', async () => {
      const { pulse, sessionFn } = createMockPulse()
      const mw = pulseMiddleware({
        pulse,
        customerId: async () => 'async_user',
        meters: { input: 'in', output: 'out' },
      })

      await mw.wrapGenerate!({
        doGenerate: vi.fn().mockResolvedValue({
          usage: { inputTokens: { total: 1 }, outputTokens: { total: 1 } },
        }),
      } as any)

      await new Promise((r) => setTimeout(r, 10))
      expect(sessionFn).toHaveBeenCalledWith('async_user')
    })

    it('does not propagate tracking errors (fire-and-forget)', async () => {
      const { pulse } = createMockPulse()

      // Make the session.end() throw
      ;(pulse.metering.session as any).mockReturnValue({
        track: vi.fn().mockReturnThis(),
        end: vi.fn().mockRejectedValue(new Error('Network error')),
      })

      const mw = pulseMiddleware({
        pulse,
        customerId: 'user_1',
        meters: { input: 'in', output: 'out' },
      })

      const mockResult = {
        usage: { inputTokens: { total: 10 }, outputTokens: { total: 5 } },
      }

      // Should not throw even though tracking fails
      const result = await mw.wrapGenerate!({
        doGenerate: vi.fn().mockResolvedValue(mockResult),
      } as any)

      expect(result).toBe(mockResult)

      // Wait for fire-and-forget to settle
      await new Promise((r) => setTimeout(r, 10))
    })
  })

  describe('wrapStream', () => {
    it('intercepts finish chunk and tracks usage', async () => {
      const { pulse, sessionFn } = createMockPulse()
      const mw = pulseMiddleware({
        pulse,
        customerId: 'user_1',
        meters: { input: 'input_tokens', output: 'output_tokens' },
      })

      const finishChunk = {
        type: 'finish',
        usage: { inputTokens: { total: 200 }, outputTokens: { total: 100 } },
      }
      const textChunk = { type: 'text-delta', text: 'hello' }

      const readable = new ReadableStream({
        start(controller) {
          controller.enqueue(textChunk)
          controller.enqueue(finishChunk)
          controller.close()
        },
      })

      const result = await mw.wrapStream!({
        doStream: vi.fn().mockResolvedValue({ stream: readable, rawCall: {} }),
      } as any)

      // Consume the stream
      const reader = result.stream.getReader()
      const chunks: any[] = []
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
      }

      expect(chunks).toHaveLength(2)
      expect(chunks[0]).toEqual(textChunk)
      expect(chunks[1]).toEqual(finishChunk)

      // Wait for fire-and-forget
      await new Promise((r) => setTimeout(r, 10))
      expect(sessionFn).toHaveBeenCalledWith('user_1')
    })

    it('passes through non-finish chunks unchanged', async () => {
      const { pulse } = createMockPulse()
      const mw = pulseMiddleware({
        pulse,
        customerId: 'user_1',
        meters: { input: 'in', output: 'out' },
      })

      const chunks = [
        { type: 'text-delta', text: 'Hi' },
        { type: 'text-delta', text: ' there' },
      ]

      const readable = new ReadableStream({
        start(controller) {
          for (const chunk of chunks) controller.enqueue(chunk)
          controller.close()
        },
      })

      const result = await mw.wrapStream!({
        doStream: vi.fn().mockResolvedValue({ stream: readable, rawCall: {} }),
      } as any)

      const reader = result.stream.getReader()
      const output: any[] = []
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        output.push(value)
      }

      expect(output).toEqual(chunks)
    })

    it('preserves rest properties from doStream', async () => {
      const { pulse } = createMockPulse()
      const mw = pulseMiddleware({
        pulse,
        customerId: 'user_1',
        meters: { input: 'in', output: 'out' },
      })

      const readable = new ReadableStream({
        start(controller) {
          controller.close()
        },
      })

      const result = await mw.wrapStream!({
        doStream: vi.fn().mockResolvedValue({
          stream: readable,
          rawCall: { headers: {} },
          rawResponse: { id: 'resp_1' },
        }),
      } as any)

      expect(result.rawCall).toEqual({ headers: {} })
      expect((result as any).rawResponse).toEqual({ id: 'resp_1' })
    })
  })

  it('includes metadata when provided', async () => {
    const sessionEvents: any[] = []
    const mockSession = {
      track: vi.fn((_m: string, _v: any, meta: any) => {
        sessionEvents.push(meta)
        return mockSession
      }),
      end: vi.fn().mockResolvedValue({ accepted: 0, failed: 0, results: [] }),
    }

    const pulse = {
      metering: { session: vi.fn().mockReturnValue(mockSession) },
    } as unknown as Pulse

    const mw = pulseMiddleware({
      pulse,
      customerId: 'user_1',
      meters: { input: 'in', output: 'out' },
      metadata: { model: 'gpt-4', env: 'prod' },
    })

    await mw.wrapGenerate!({
      doGenerate: vi.fn().mockResolvedValue({
        usage: { inputTokens: { total: 10 }, outputTokens: { total: 5 } },
      }),
    } as any)

    await new Promise((r) => setTimeout(r, 10))

    expect(mockSession.track).toHaveBeenCalledWith('in', 10, { model: 'gpt-4', env: 'prod' })
    expect(mockSession.track).toHaveBeenCalledWith('out', 5, { model: 'gpt-4', env: 'prod' })
  })
})
