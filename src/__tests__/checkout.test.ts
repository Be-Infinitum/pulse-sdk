import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mountCheckout } from '../checkout/checkout'

// Mock DOM environment
function createMockContainer() {
  const children: any[] = []
  return {
    appendChild: vi.fn((child: any) => children.push(child)),
    children,
  }
}

function createMockIframe() {
  return {
    src: '',
    style: {} as Record<string, string>,
    setAttribute: vi.fn(),
    allow: '',
    contentWindow: {
      postMessage: vi.fn(),
    },
    remove: vi.fn(),
  }
}

describe('mountCheckout', () => {
  let mockContainer: ReturnType<typeof createMockContainer>
  let mockIframe: ReturnType<typeof createMockIframe>
  let messageHandlers: Array<(event: MessageEvent) => void>

  beforeEach(() => {
    vi.restoreAllMocks()
    mockContainer = createMockContainer()
    mockIframe = createMockIframe()
    messageHandlers = []

    vi.stubGlobal('document', {
      querySelector: vi.fn().mockReturnValue(mockContainer),
      createElement: vi.fn().mockReturnValue(mockIframe),
    })

    vi.stubGlobal('window', {
      addEventListener: vi.fn((event: string, handler: any) => {
        if (event === 'message') messageHandlers.push(handler)
      }),
      removeEventListener: vi.fn((event: string, handler: any) => {
        messageHandlers = messageHandlers.filter((h) => h !== handler)
      }),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('finds container by selector string', () => {
    mountCheckout('#checkout', { linkId: 'abc' })

    expect(document.querySelector).toHaveBeenCalledWith('#checkout')
  })

  it('throws when selector string not found', () => {
    ;(document.querySelector as any).mockReturnValue(null)

    expect(() => mountCheckout('#missing', { linkId: 'abc' })).toThrow(
      '[Pulse Checkout] Container not found: #missing'
    )
  })

  it('accepts HTMLElement directly', () => {
    const el = createMockContainer() as any
    mountCheckout(el, { linkId: 'abc' })

    expect(el.appendChild).toHaveBeenCalled()
  })

  it('creates iframe with correct src', () => {
    mountCheckout('#checkout', { linkId: 'link-123' })

    expect(mockIframe.src).toBe('https://pulse.beinfi.com/embed/pay/link-123')
  })

  it('creates iframe with custom baseUrl', () => {
    mountCheckout('#checkout', { linkId: 'link-123', baseUrl: 'https://custom.com/' })

    expect(mockIframe.src).toBe('https://custom.com/embed/pay/link-123')
  })

  it('applies correct iframe styles', () => {
    mountCheckout('#checkout', { linkId: 'abc' })

    expect(mockIframe.style.width).toBe('100%')
    expect(mockIframe.style.border).toBe('none')
    expect(mockIframe.style.colorScheme).toBe('normal')
  })

  it('sets iframe attributes', () => {
    mountCheckout('#checkout', { linkId: 'abc' })

    expect(mockIframe.setAttribute).toHaveBeenCalledWith('allowtransparency', 'true')
    expect(mockIframe.allow).toBe('clipboard-write')
  })

  describe('message handling', () => {
    function dispatchMessage(type: string, data?: Record<string, unknown>) {
      const event = {
        origin: 'https://pulse.beinfi.com',
        data: { type, ...data },
      } as MessageEvent
      for (const handler of messageHandlers) handler(event)
    }

    it('calls onReady on pulse:ready', () => {
      const onReady = vi.fn()
      mountCheckout('#checkout', { linkId: 'abc', onReady })

      dispatchMessage('pulse:ready')

      expect(onReady).toHaveBeenCalled()
    })

    it('sends theme config on pulse:ready when theme is set', () => {
      const theme = { background: '#000', accent: '#f00' }
      mountCheckout('#checkout', { linkId: 'abc', theme })

      dispatchMessage('pulse:ready')

      expect(mockIframe.contentWindow.postMessage).toHaveBeenCalledWith(
        { type: 'pulse:config', theme },
        'https://pulse.beinfi.com'
      )
    })

    it('resizes iframe on pulse:resize', () => {
      mountCheckout('#checkout', { linkId: 'abc' })

      dispatchMessage('pulse:resize', { height: 500 })

      expect(mockIframe.style.height).toBe('500px')
    })

    it('calls onSuccess on pulse:success', () => {
      const onSuccess = vi.fn()
      mountCheckout('#checkout', { linkId: 'abc', onSuccess })

      const payment = { paymentIntentId: 'pi_1', amount: '100', currency: 'USD', method: 'crypto' }
      dispatchMessage('pulse:success', { payment })

      expect(onSuccess).toHaveBeenCalledWith(payment)
    })

    it('calls onError on pulse:error', () => {
      const onError = vi.fn()
      mountCheckout('#checkout', { linkId: 'abc', onError })

      const error = { message: 'Payment failed', code: 'payment_failed' }
      dispatchMessage('pulse:error', { error })

      expect(onError).toHaveBeenCalledWith(error)
    })

    it('ignores messages from different origins', () => {
      const onReady = vi.fn()
      mountCheckout('#checkout', { linkId: 'abc', onReady })

      const event = {
        origin: 'https://evil.com',
        data: { type: 'pulse:ready' },
      } as MessageEvent
      for (const handler of messageHandlers) handler(event)

      expect(onReady).not.toHaveBeenCalled()
    })
  })

  describe('on() event handler', () => {
    function dispatchMessage(type: string, data?: Record<string, unknown>) {
      const event = {
        origin: 'https://pulse.beinfi.com',
        data: { type, ...data },
      } as MessageEvent
      for (const handler of messageHandlers) handler(event)
    }

    it('registers and fires event handler', () => {
      const instance = mountCheckout('#checkout', { linkId: 'abc' })
      const handler = vi.fn()
      instance.on('ready', handler)

      dispatchMessage('pulse:ready')

      expect(handler).toHaveBeenCalled()
    })

    it('fires success handler with payment data', () => {
      const instance = mountCheckout('#checkout', { linkId: 'abc' })
      const handler = vi.fn()
      instance.on('success', handler)

      const payment = { paymentIntentId: 'pi_1', amount: '50', currency: 'USD', method: 'pix' }
      dispatchMessage('pulse:success', { payment })

      expect(handler).toHaveBeenCalledWith(payment)
    })
  })

  describe('unmount', () => {
    it('removes iframe and event listener', () => {
      const instance = mountCheckout('#checkout', { linkId: 'abc' })

      instance.unmount()

      expect(mockIframe.remove).toHaveBeenCalled()
      expect(window.removeEventListener).toHaveBeenCalledWith('message', expect.any(Function))
    })

    it('calls onClose callback', () => {
      const onClose = vi.fn()
      const instance = mountCheckout('#checkout', { linkId: 'abc', onClose })

      instance.unmount()

      expect(onClose).toHaveBeenCalled()
    })

    it('emits close event', () => {
      const instance = mountCheckout('#checkout', { linkId: 'abc' })
      const handler = vi.fn()
      instance.on('close', handler)

      instance.unmount()

      expect(handler).toHaveBeenCalled()
    })
  })
})
