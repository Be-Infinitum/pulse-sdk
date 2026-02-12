'use client'

import { Pulse } from '@infi/pulse-sdk'
import { useEffect, useRef, useState } from 'react'

interface EmbeddedCheckoutProps {
  linkId: string
}

export function EmbeddedCheckout({ linkId }: EmbeddedCheckoutProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const instanceRef = useRef<ReturnType<typeof Pulse.checkout.mount> | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'success' | 'error'>('loading')
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    if (!containerRef.current || instanceRef.current) return

    instanceRef.current = Pulse.checkout.mount(containerRef.current, {
      linkId,
      baseUrl: process.env.NEXT_PUBLIC_PULSE_CHECKOUT_URL ?? 'https://pulse.beinfi.com',
      theme: {
        background: '#1a1a2e',
        foreground: '#e0e0e0',
        card: '#16213e',
        accent: '#e94560',
        accentForeground: '#ffffff',
      },
      onReady() {
        setStatus('ready')
      },
      onSuccess(payment) {
        setStatus('success')
        setResult(payment)
      },
      onError(error) {
        setStatus('error')
        setResult(error)
      },
    })

    return () => {
      instanceRef.current?.unmount()
      instanceRef.current = null
    }
  }, [linkId])

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-400">Widget status:</span>
        <span
          className={`inline-block text-xs px-2 py-0.5 rounded ${
            status === 'ready'
              ? 'bg-blue-900/50 text-blue-300'
              : status === 'success'
                ? 'bg-green-900/50 text-green-300'
                : status === 'error'
                  ? 'bg-red-900/50 text-red-300'
                  : 'bg-gray-700 text-gray-300'
          }`}
        >
          {status}
        </span>
      </div>

      <div
        ref={containerRef}
        className="rounded-lg overflow-hidden border border-gray-800"
      />

      {result && (
        <pre className="text-xs text-gray-400 bg-gray-800 rounded p-3 overflow-x-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  )
}
