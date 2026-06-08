import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/agent/orchestrator', () => ({
  runMigration: vi.fn(),
}))
vi.mock('@/lib/ndjson', () => ({
  agentEventStream: vi.fn(),
  collectEvents: vi.fn(),
}))

import { runMigration } from '@/lib/agent/orchestrator'
import { collectEvents } from '@/lib/ndjson'
import { POST } from '../route'

const mockRunMigration = vi.mocked(runMigration)
const mockCollectEvents = vi.mocked(collectEvents)

const validBody = {
  files: [{ name: 'app.ts', code: 'const x = 1' }],
  sourceFramework: 'express',
  targetFramework: 'fastify',
}

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/migrate', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

const validResult = {
  success: true,
  migratedFiles: [],
  plan: { steps: [], notes: [] },
  verification: { passed: true, checks: [], remainingIssues: [], report: 'ok' },
  errors: [],
  rolledBack: false,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/migrate', () => {
  it('returns 400 for invalid JSON body', async () => {
    const req = new NextRequest('http://localhost/api/migrate', {
      method: 'POST',
      body: 'not json',
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid framework combo', async () => {
    const req = makeRequest({ ...validBody, targetFramework: 'react' }) // cross-category
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when same source/target', async () => {
    const req = makeRequest({ ...validBody, targetFramework: 'express' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns result in buffered mode', async () => {
    mockRunMigration.mockReturnValue((async function* () {
      yield { type: 'result', result: validResult }
    })() as never)
    mockCollectEvents.mockResolvedValueOnce([{ type: 'result', result: validResult }])

    const req = makeRequest(validBody) // stream defaults to false
    const res = await POST(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
  })

  it('returns 502 when no result event is produced', async () => {
    mockRunMigration.mockReturnValue((async function* () {})() as never)
    mockCollectEvents.mockResolvedValueOnce([])

    const req = makeRequest(validBody)
    const res = await POST(req)
    expect(res.status).toBe(502)
  })
})
