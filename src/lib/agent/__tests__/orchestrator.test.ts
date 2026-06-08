import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../gemini', () => ({
  generateJson: vi.fn(),
}))

import { generateJson } from '../../gemini'
import { runMigration, resumeExecution } from '../orchestrator'
import type { Framework } from '../../frameworks'

const mockGenerateJson = vi.mocked(generateJson)

const source: Framework = { id: 'express', label: 'Express', category: 'backend', language: 'javascript', description: '' }
const target: Framework = { id: 'fastify', label: 'Fastify', category: 'backend', language: 'typescript', description: '' }
const files = [{ name: 'app.ts', code: 'const app = express()' }]

const validAnalysis = JSON.stringify({
  summary: 'Simple app',
  detectedPatterns: [],
  dependencies: ['express'],
  potentialIssues: [],
  filesOverview: [{ name: 'app.ts', role: 'entry', language: 'TypeScript' }],
})

const validPlan = JSON.stringify({
  steps: [
    { id: 0, title: 'Replace imports', description: 'Swap express for fastify', dependsOn: [], complexity: 'low', targetFiles: ['app.ts'], status: 'pending' },
  ],
  notes: [],
})

const validStepOutput = JSON.stringify({
  files: [{ name: 'app.ts', migratedCode: 'const app = fastify()' }],
})

const validVerification = JSON.stringify({
  passed: true,
  checks: [{ name: 'imports', passed: true, detail: 'Updated' }],
  remainingIssues: [],
  report: 'Migration succeeded.',
})

async function collect<T>(gen: AsyncGenerator<T>): Promise<T[]> {
  const events: T[] = []
  for await (const e of gen) events.push(e)
  return events
}

beforeEach(() => {
  mockGenerateJson.mockReset()
})

describe('runMigration', () => {
  it('emits all 4 phase events and a result event in order', async () => {
    mockGenerateJson
      .mockResolvedValueOnce(validAnalysis)
      .mockResolvedValueOnce(validPlan)
      .mockResolvedValueOnce(validStepOutput)
      .mockResolvedValueOnce(validVerification)

    const events = await collect(runMigration({ files, source, target, requireApproval: false }))
    const types = events.map((e) => e.type)

    expect(types).toContain('phase')
    expect(types).toContain('result')

    const phases = events.filter((e) => e.type === 'phase').map((e) => (e as { type: 'phase'; phase: string; status: string }).phase)
    expect(phases).toContain('analysis')
    expect(phases).toContain('planning')
    expect(phases).toContain('execution')
    expect(phases).toContain('verification')

    const resultEvent = events.find((e) => e.type === 'result') as { type: 'result'; result: { success: boolean } }
    expect(resultEvent.result.success).toBe(true)
  })

  it('emits awaiting_approval and stops when requireApproval is true', async () => {
    mockGenerateJson
      .mockResolvedValueOnce(validAnalysis)
      .mockResolvedValueOnce(validPlan)

    const events = await collect(runMigration({ files, source, target, requireApproval: true }))
    const types = events.map((e) => e.type)

    expect(types).toContain('awaiting_approval')
    expect(types).not.toContain('result')
    // Execution phase should not start
    const phases = events.filter((e) => e.type === 'phase').map((e) => (e as { type: 'phase'; phase: string }).phase)
    expect(phases).not.toContain('execution')
  })

  it('emits error event when analysis fails', async () => {
    mockGenerateJson.mockRejectedValueOnce(new Error('API error'))

    const events = await collect(runMigration({ files, source, target, requireApproval: false }))
    const errorEvent = events.find((e) => e.type === 'error') as { type: 'error'; message: string } | undefined
    expect(errorEvent).toBeDefined()
    expect(errorEvent!.message).toContain('API error')
  })
})

describe('resumeExecution', () => {
  it('runs execution+verification and emits result', async () => {
    mockGenerateJson
      .mockResolvedValueOnce(validStepOutput)
      .mockResolvedValueOnce(validVerification)

    const analysis = JSON.parse(validAnalysis)
    const plan = JSON.parse(validPlan)
    const events = await collect(resumeExecution({ files, source, target, analysis, plan }))
    const resultEvent = events.find((e) => e.type === 'result') as { type: 'result'; result: { success: boolean } } | undefined
    expect(resultEvent).toBeDefined()
    expect(resultEvent!.result.success).toBe(true)
  })
})
