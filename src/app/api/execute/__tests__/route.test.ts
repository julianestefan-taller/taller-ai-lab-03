import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/agent/orchestrator', () => ({
  resumeExecution: vi.fn(),
}))
vi.mock('@/lib/ndjson', () => ({
  agentEventStream: vi.fn(),
  collectEvents: vi.fn(),
}))

import { resumeExecution } from '@/lib/agent/orchestrator'
import { collectEvents } from '@/lib/ndjson'
import { POST } from '../route'

const mockResumeExecution = vi.mocked(resumeExecution)
const mockCollectEvents = vi.mocked(collectEvents)

const validAnalysis = {
  summary: 'ok',
  detectedPatterns: [],
  dependencies: [],
  potentialIssues: [],
  filesOverview: [],
}

const validPlan = {
  steps: [{ id: 0, title: 'T', description: 'D', dependsOn: [], complexity: 'low', targetFiles: [], status: 'pending' }],
  notes: [],
}

const validBody = {
  files: [{ name: 'app.ts', code: 'const x = 1' }],
  sourceFramework: 'express',
  targetFramework: 'fastify',
  analysis: validAnalysis,
  plan: validPlan,
}

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/execute', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

const validResult = {
  success: true,
  migratedFiles: [],
  plan: validPlan,
  verification: { passed: true, checks: [], remainingIssues: [], report: 'ok' },
  errors: [],
  rolledBack: false,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/execute', () => {
  it('returns 400 for missing plan', async () => {
    const { plan: _plan, ...bodyWithoutPlan } = validBody
    const req = makeRequest(bodyWithoutPlan)
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid analysis object', async () => {
    const req = makeRequest({ ...validBody, analysis: { broken: true } })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns result in buffered mode', async () => {
    mockResumeExecution.mockReturnValue((async function* () {
      yield { type: 'result', result: validResult }
    })() as never)
    mockCollectEvents.mockResolvedValueOnce([{ type: 'result', result: validResult }])

    const req = makeRequest(validBody)
    const res = await POST(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
  })

  it('returns 502 when no result event', async () => {
    mockResumeExecution.mockReturnValue((async function* () {})() as never)
    mockCollectEvents.mockResolvedValueOnce([])

    const req = makeRequest(validBody)
    const res = await POST(req)
    expect(res.status).toBe(502)
  })
})
