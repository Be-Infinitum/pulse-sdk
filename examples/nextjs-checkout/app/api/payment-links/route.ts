import { Pulse } from '@infi/pulse-sdk'
import { NextResponse } from 'next/server'

const pulse = new Pulse({
  apiKey: process.env.PULSE_API_KEY!,
  baseUrl: process.env.PULSE_API_BASE_URL,
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const link = await pulse.paymentLinks.create({
      title: body.title,
      amount: body.amount,
      description: body.description || undefined,
      currency: body.currency || undefined,
    })
    return NextResponse.json(link)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? 'Failed to create payment link' },
      { status: error.status ?? 500 }
    )
  }
}
