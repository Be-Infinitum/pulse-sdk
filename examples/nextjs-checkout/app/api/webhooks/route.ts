import { Pulse } from '@infi/pulse-sdk'
import { NextResponse } from 'next/server'
import { events } from './events'

export async function POST(request: Request) {
  const secret = process.env.PULSE_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    )
  }

  const rawBody = await request.text()
  const signature = request.headers.get('X-Pulse-Signature') ?? ''
  const eventType = request.headers.get('X-Pulse-Event') ?? 'unknown'

  const isValid = Pulse.webhooks.verifySignature(rawBody, signature, secret)
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const payload = JSON.parse(rawBody)

  events.push({
    id: crypto.randomUUID(),
    event: eventType,
    payload,
    receivedAt: new Date().toISOString(),
  })

  return NextResponse.json({ received: true })
}
