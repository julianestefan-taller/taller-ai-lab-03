import { NextRequest, NextResponse } from 'next/server'
import { MigrateRequestSchema } from '@/lib/schemas'
import { getFramework } from '@/lib/frameworks'
import { runMigration } from '@/lib/agent/orchestrator'
import { agentEventStream, collectEvents } from '@/lib/ndjson'

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = MigrateRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { files, sourceFramework, targetFramework, requireApproval, stream } = parsed.data
  const source = getFramework(sourceFramework)!
  const target = getFramework(targetFramework)!

  const gen = runMigration({ files, source, target, requireApproval })

  if (stream) {
    return agentEventStream(gen)
  }

  // Buffered mode — collect all events and return the final result/error
  try {
    const events = await collectEvents(gen)
    const resultEvent = events.findLast((e) => e.type === 'result')
    const approvalEvent = events.findLast((e) => e.type === 'awaiting_approval')
    const errorEvent = events.findLast((e) => e.type === 'error')

    if (resultEvent?.type === 'result') {
      return NextResponse.json(resultEvent.result)
    }
    if (approvalEvent?.type === 'awaiting_approval') {
      return NextResponse.json(
        { awaiting_approval: true, analysis: approvalEvent.analysis, plan: approvalEvent.plan },
        { status: 202 }
      )
    }
    if (errorEvent?.type === 'error') {
      return NextResponse.json({ error: errorEvent.message }, { status: 502 })
    }
    return NextResponse.json({ error: 'No result produced' }, { status: 502 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Migration failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
