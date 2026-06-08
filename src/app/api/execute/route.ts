import { NextRequest, NextResponse } from 'next/server'
import { ExecuteRequestSchema, AnalysisResultSchema, MigrationPlanSchema } from '@/lib/schemas'
import { getFramework } from '@/lib/frameworks'
import { resumeExecution } from '@/lib/agent/orchestrator'
import { agentEventStream, collectEvents } from '@/lib/ndjson'

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = ExecuteRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { files, sourceFramework, targetFramework, analysis: rawAnalysis, plan: rawPlan, stream } = parsed.data

  const analysisResult = AnalysisResultSchema.safeParse(rawAnalysis)
  if (!analysisResult.success) {
    return NextResponse.json(
      { error: 'Invalid analysis object', details: analysisResult.error.flatten() },
      { status: 400 }
    )
  }

  const planResult = MigrationPlanSchema.safeParse(rawPlan)
  if (!planResult.success) {
    return NextResponse.json(
      { error: 'Invalid plan object', details: planResult.error.flatten() },
      { status: 400 }
    )
  }

  const source = getFramework(sourceFramework)
  const target = getFramework(targetFramework)
  if (!source || !target) {
    return NextResponse.json({ error: 'Unknown framework' }, { status: 400 })
  }

  const gen = resumeExecution({
    files,
    source,
    target,
    analysis: analysisResult.data,
    plan: planResult.data,
  })

  if (stream) {
    return agentEventStream(gen)
  }

  try {
    const events = await collectEvents(gen)
    const resultEvent = events.findLast((e) => e.type === 'result')
    const errorEvent = events.findLast((e) => e.type === 'error')

    if (resultEvent?.type === 'result') {
      return NextResponse.json(resultEvent.result)
    }
    if (errorEvent?.type === 'error') {
      return NextResponse.json({ error: errorEvent.message }, { status: 502 })
    }
    return NextResponse.json({ error: 'No result produced' }, { status: 502 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Execution failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
