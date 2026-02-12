'use client'

import { useEffect, useState } from 'react'
import { EmbeddedCheckout } from './EmbeddedCheckout'

interface PaymentLink {
  id: string
  title: string
  description: string | null
  amount: string
  currency: string
  status: string
  slug: string
}

interface WebhookEvent {
  id: string
  event: string
  payload: Record<string, unknown>
  receivedAt: string
}

export default function Home() {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [loading, setLoading] = useState(false)
  const [createdLink, setCreatedLink] = useState<PaymentLink | null>(null)
  const [error, setError] = useState('')
  const [events, setEvents] = useState<WebhookEvent[]>([])
  const [copied, setCopied] = useState(false)

  // Poll for webhook events
  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const res = await fetch('/api/events')
        const data = await res.json()
        setEvents(data)
      } catch {}
    }, 3000)
    return () => clearInterval(poll)
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/payment-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, amount, currency }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCreatedLink(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function getPaymentUrl(link: PaymentLink) {
    return `https://pulse.beinfi.com/pay/${link.id}`
  }

  async function copyUrl() {
    if (!createdLink) return
    await navigator.clipboard.writeText(getPaymentUrl(createdLink))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Pulse SDK — Checkout Example</h1>
        <p className="text-gray-400 mt-1 text-sm">
          Create a payment link, pay it, and see the webhook event arrive in real time.
        </p>
      </header>

      {/* Section 1: Create Payment Link */}
      <section className="bg-gray-900 rounded-lg p-6 border border-gray-800">
        <h2 className="text-lg font-semibold mb-4">Create Payment Link</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm text-gray-400 mb-1">
              Title
            </label>
            <input
              id="title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Order #42"
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label htmlFor="amount" className="block text-sm text-gray-400 mb-1">
                Amount
              </label>
              <input
                id="amount"
                type="text"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="100.00"
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="w-28">
              <label htmlFor="currency" className="block text-sm text-gray-400 mb-1">
                Currency
              </label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="USD">USD</option>
                <option value="BRL">BRL</option>
              </select>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
          >
            {loading ? 'Creating...' : 'Create Payment Link'}
          </button>
        </form>
      </section>

      {/* Section 2: Created Payment Link */}
      {createdLink && (
        <section className="bg-gray-900 rounded-lg p-6 border border-gray-800">
          <h2 className="text-lg font-semibold mb-4">Payment Link Created</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-4">
            <dt className="text-gray-400">Title</dt>
            <dd>{createdLink.title}</dd>
            <dt className="text-gray-400">Amount</dt>
            <dd>{createdLink.amount} {createdLink.currency}</dd>
            <dt className="text-gray-400">Status</dt>
            <dd>
              <span className="inline-block bg-yellow-900/50 text-yellow-300 text-xs px-2 py-0.5 rounded">
                {createdLink.status}
              </span>
            </dd>
            <dt className="text-gray-400">Link ID</dt>
            <dd className="font-mono text-xs break-all">{createdLink.id}</dd>
          </dl>

          <div className="flex items-center gap-2">
            <code className="flex-1 bg-gray-800 text-xs px-3 py-2 rounded overflow-x-auto">
              {getPaymentUrl(createdLink)}
            </code>
            <button
              onClick={copyUrl}
              className="shrink-0 bg-gray-800 hover:bg-gray-700 text-sm px-3 py-2 rounded transition-colors"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </section>
      )}

      {/* Section 3: Embedded Checkout */}
      {createdLink && (
        <section className="bg-gray-900 rounded-lg p-6 border border-gray-800">
          <h2 className="text-lg font-semibold mb-4">Embedded Checkout</h2>
          <p className="text-gray-400 text-sm mb-4">
            This is the embeddable checkout widget rendered via{' '}
            <code className="bg-gray-800 px-1.5 py-0.5 rounded text-xs">Pulse.checkout.mount()</code>
          </p>
          <EmbeddedCheckout linkId={createdLink.id} />
        </section>
      )}

      {/* Section 4: Webhook Event Log */}
      <section className="bg-gray-900 rounded-lg p-6 border border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Webhook Event Log</h2>
          <span className="text-xs text-gray-500">Polling every 3s</span>
        </div>

        {events.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No events received yet. Pay the link above and watch for webhooks.
          </p>
        ) : (
          <ul className="space-y-3">
            {events.map((ev) => (
              <li key={ev.id} className="bg-gray-800 rounded p-3 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`inline-block text-xs px-2 py-0.5 rounded ${
                      ev.event === 'payment.confirmed'
                        ? 'bg-green-900/50 text-green-300'
                        : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    {ev.event}
                  </span>
                  <span className="text-gray-500 text-xs">
                    {new Date(ev.receivedAt).toLocaleTimeString()}
                  </span>
                </div>
                <pre className="text-xs text-gray-400 overflow-x-auto">
                  {JSON.stringify(ev.payload, null, 2)}
                </pre>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
