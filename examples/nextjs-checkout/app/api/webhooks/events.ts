export interface StoredEvent {
  id: string
  event: string
  payload: Record<string, unknown>
  receivedAt: string
}

export const events: StoredEvent[] = []
