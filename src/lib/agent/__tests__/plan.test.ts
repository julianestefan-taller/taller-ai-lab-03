import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../gemini', () => ({
  generateJson: vi.fn(),
}))

import { generateJson } from '../../gemini'
import { createPlan } from '../plan'
import type { Framework } from '../../frameworks'
import type { AnalysisResult } from '../../schemas'

const mockGenerateJson = vi.mocked(generateJson)

const source: Framework = { id: 'express', label: 'Express', category: 'backend', language: 'javascript', description: '' }
const target: Framework = { id: 'fastify', label: 'Fastify', category: 'backend', language: 'typescript', description: '' }
const files = [{ name: 'app.ts', code: 'const x = 1' }]
const analysis: AnalysisResult = {
  summary: 'A simple app',
  detectedPatterns: [],
  dependencies: ['express'],
  potentialIssues: [],
  filesOverview: [{ name: 'app.ts', role: 'entry', language: 'TypeScript' }],
}

const validPlan = {
  steps: [
    {
      id: 0,
      title: 'Replace imports',
      description: 'Swap express for fastify',
      dependsOn: [],
      complexity: 'low',
      targetFiles: ['app.ts'],
      status: 'pending',
    },
  ],
  notes: [],
}

beforeEach(() => {
  mockGenerateJson.mockReset()
})

describe('createPlan', () => {
  it('returns a valid plan on success', async () => {
    mockGenerateJson.mockResolvedValueOnce(JSON.stringify(validPlan))
    const result = await createPlan(files, source, target, analysis)
    expect(result.steps).toHaveLength(1)
    expect(result.steps[0].title).toBe('Replace imports')
  })

  it('throws on non-JSON LLM response', async () => {
    mockGenerateJson.mockResolvedValueOnce('not valid json')
    await expect(createPlan(files, source, target, analysis)).rejects.toThrow('non-JSON')
  })

  it('throws when plan fails schema validation', async () => {
    mockGenerateJson.mockResolvedValueOnce(JSON.stringify({ steps: [], notes: [] })) // empty steps
    await expect(createPlan(files, source, target, analysis)).rejects.toThrow('schema validation')
  })
})
