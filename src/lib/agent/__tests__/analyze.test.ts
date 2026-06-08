import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../gemini', () => ({
  generateJson: vi.fn(),
}))

import { generateJson } from '../../gemini'
import { analyzeSource } from '../analyze'
import type { Framework } from '../../frameworks'

const mockGenerateJson = vi.mocked(generateJson)

const source: Framework = { id: 'express', label: 'Express', category: 'backend', language: 'javascript', description: '' }
const target: Framework = { id: 'fastify', label: 'Fastify', category: 'backend', language: 'typescript', description: '' }
const files = [{ name: 'app.ts', code: 'const x = 1' }]

const validAnalysis = {
  summary: 'A simple app',
  detectedPatterns: ['routing'],
  dependencies: ['express'],
  potentialIssues: [],
  filesOverview: [{ name: 'app.ts', role: 'entry', language: 'TypeScript' }],
}

beforeEach(() => {
  mockGenerateJson.mockReset()
})

describe('analyzeSource', () => {
  it('returns parsed analysis on success', async () => {
    mockGenerateJson.mockResolvedValueOnce(JSON.stringify(validAnalysis))
    const result = await analyzeSource(files, source, target)
    expect(result.summary).toBe('A simple app')
    expect(result.detectedPatterns).toContain('routing')
  })

  it('throws when LLM returns non-JSON', async () => {
    mockGenerateJson.mockResolvedValueOnce('not json')
    await expect(analyzeSource(files, source, target)).rejects.toThrow('non-JSON')
  })

  it('throws when LLM output fails schema validation', async () => {
    mockGenerateJson.mockResolvedValueOnce(JSON.stringify({ summary: 'ok' })) // missing fields
    await expect(analyzeSource(files, source, target)).rejects.toThrow('schema validation')
  })

  it('passes source/target framework info to the prompt', async () => {
    mockGenerateJson.mockResolvedValueOnce(JSON.stringify(validAnalysis))
    await analyzeSource(files, source, target)
    const userMsg = mockGenerateJson.mock.calls[0][1]
    expect(userMsg).toContain('Express')
    expect(userMsg).toContain('Fastify')
  })
})
