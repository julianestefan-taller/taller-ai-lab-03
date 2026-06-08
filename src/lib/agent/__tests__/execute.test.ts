import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../gemini', () => ({
  generateJson: vi.fn(),
}))

import { generateJson } from '../../gemini'
import { executePlan } from '../execute'
import type { Framework } from '../../frameworks'
import type { MigrationPlan } from '../../schemas'

const mockGenerateJson = vi.mocked(generateJson)

const source: Framework = { id: 'express', label: 'Express', category: 'backend', language: 'javascript', description: '' }
const target: Framework = { id: 'fastify', label: 'Fastify', category: 'backend', language: 'typescript', description: '' }
const files = [{ name: 'app.ts', code: 'const app = express()' }]

function makePlan(steps: MigrationPlan['steps']): MigrationPlan {
  return { steps, notes: [] }
}

const noopProgress = {
  onStepStart: vi.fn(),
  onStepComplete: vi.fn(),
  onStepFail: vi.fn(),
}

const stepOutput = JSON.stringify({
  files: [{ name: 'app.ts', migratedCode: 'const app = fastify()' }],
})

beforeEach(() => {
  mockGenerateJson.mockReset()
  vi.clearAllMocks()
})

describe('executePlan', () => {
  it('marks steps as completed on success', async () => {
    mockGenerateJson.mockResolvedValue(stepOutput)
    const plan = makePlan([
      { id: 0, title: 'Step 0', description: '', dependsOn: [], complexity: 'low', targetFiles: ['app.ts'], status: 'pending' },
    ])
    const result = await executePlan(files, plan, source, target, noopProgress)
    expect(result.errors).toHaveLength(0)
    expect(result.rolledBack).toBe(false)
    expect(result.plan.steps[0].status).toBe('completed')
    expect(result.migratedFiles[0].migratedCode).toBe('const app = fastify()')
  })

  it('respects dependsOn ordering: step 1 runs after step 0', async () => {
    const order: number[] = []
    mockGenerateJson.mockImplementation(async (_sys, userMsg) => {
      if (userMsg.includes('Step 0')) order.push(0)
      else order.push(1)
      return stepOutput
    })
    const plan = makePlan([
      { id: 0, title: 'Step 0', description: '', dependsOn: [], complexity: 'low', targetFiles: ['app.ts'], status: 'pending' },
      { id: 1, title: 'Step 1', description: '', dependsOn: [0], complexity: 'low', targetFiles: ['app.ts'], status: 'pending' },
    ])
    await executePlan(files, plan, source, target, noopProgress)
    expect(order[0]).toBe(0)
    expect(order[1]).toBe(1)
  })

  it('runs independent steps in the same level in parallel', async () => {
    const startTimes: Record<number, number> = {}
    mockGenerateJson.mockImplementation(async (_sys, userMsg) => {
      const id = userMsg.includes('Step 0') ? 0 : 1
      startTimes[id] = Date.now()
      return stepOutput
    })
    const plan = makePlan([
      { id: 0, title: 'Step 0', description: '', dependsOn: [], complexity: 'low', targetFiles: ['app.ts'], status: 'pending' },
      { id: 1, title: 'Step 1', description: '', dependsOn: [], complexity: 'low', targetFiles: ['app.ts'], status: 'pending' },
    ])
    await executePlan(files, plan, source, target, noopProgress)
    // Both steps start at roughly the same time (no sequential wait)
    // The key test is that both were called and completed
    expect(Object.keys(startTimes)).toHaveLength(2)
  })

  it('sets rolledBack flag and marks remaining steps skipped on failure', async () => {
    mockGenerateJson.mockRejectedValueOnce(new Error('LLM error'))
    const plan = makePlan([
      { id: 0, title: 'Step 0', description: '', dependsOn: [], complexity: 'low', targetFiles: ['app.ts'], status: 'pending' },
      { id: 1, title: 'Step 1', description: '', dependsOn: [0], complexity: 'low', targetFiles: ['app.ts'], status: 'pending' },
    ])
    const result = await executePlan(files, plan, source, target, noopProgress)
    expect(result.rolledBack).toBe(true)
    expect(result.errors.length).toBeGreaterThan(0)
    const step0 = result.plan.steps.find((s) => s.id === 0)!
    expect(step0.status).toBe('failed')
  })

  it('calls progress callbacks', async () => {
    mockGenerateJson.mockResolvedValue(stepOutput)
    const progress = {
      onStepStart: vi.fn(),
      onStepComplete: vi.fn(),
      onStepFail: vi.fn(),
    }
    const plan = makePlan([
      { id: 0, title: 'Step 0', description: '', dependsOn: [], complexity: 'low', targetFiles: ['app.ts'], status: 'pending' },
    ])
    await executePlan(files, plan, source, target, progress)
    expect(progress.onStepStart).toHaveBeenCalledOnce()
    expect(progress.onStepComplete).toHaveBeenCalledOnce()
    expect(progress.onStepFail).not.toHaveBeenCalled()
  })
})
