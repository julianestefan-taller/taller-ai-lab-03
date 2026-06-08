import type { AgentEvent } from './schemas'

export function agentEventStream(gen: AsyncGenerator<AgentEvent>): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of gen) {
          controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        controller.enqueue(
          encoder.encode(JSON.stringify({ type: 'error', message } satisfies AgentEvent) + '\n')
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

export async function collectEvents(gen: AsyncGenerator<AgentEvent>): Promise<AgentEvent[]> {
  const events: AgentEvent[] = []
  for await (const event of gen) {
    events.push(event)
  }
  return events
}
