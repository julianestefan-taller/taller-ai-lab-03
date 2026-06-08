import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../gemini', () => ({
  generateJson: vi.fn(),
}))

import { generateJson } from '../../gemini'
import { verifyMigration } from '../verify'
import type { Framework } from '../../frameworks'
import type { MigratedFile, MigrationPlan } from '../../schemas'

const mockGenerateJson = vi.mocked(generateJson)

const source: Framework = { id: 'express', label: 'Express', category: 'backend', language: 'javascript', description: '' }
const target: Framework = { id: 'fastify', label: 'Fastify', category: 'backend', language: 'typescript', description: '' }

const migratedFiles: MigratedFile[] = [
  { name: 'app.ts', originalCode: 'const app = express()', migratedCode: 'const app = fastify()', stepId: 0 },
]
const plan: MigrationPlan = {
  steps: [{ id: 0, title: 'Replace imports', description: '', dependsOn: [], complexity: 'low', targetFiles: ['app.ts'], status: 'completed' }],
  notes: [],
}

const validVerification = {
  passed: true,
  checks: [{ name: 'framework_imports_updated', passed: true, detail: 'All imports updated' }],
  remainingIssues: [],
  report: 'Migration succeeded.',
}

beforeEach(() => {
  mockGenerateJson.mockReset()
})

describe('verifyMigration', () => {
  it('returns verification result on success', async () => {
    mockGenerateJson.mockResolvedValueOnce(JSON.stringify(validVerification))
    const result = await verifyMigration(migratedFiles, plan, source, target)
    expect(result.passed).toBe(true)
    expect(result.checks).toHaveLength(1)
  })

  it('handles failed verification', async () => {
    mockGenerateJson.mockResolvedValueOnce(
      JSON.stringify({ ...validVerification, passed: false, remainingIssues: ['Still uses express.Router'] })
    )
    const result = await verifyMigration(migratedFiles, plan, source, target)
    expect(result.passed).toBe(false)
    expect(result.remainingIssues).toContain('Still uses express.Router')
  })

  it('throws on non-JSON response', async () => {
    mockGenerateJson.mockResolvedValueOnce('not json')
    await expect(verifyMigration(migratedFiles, plan, source, target)).rejects.toThrow('non-JSON')
  })

  it('throws on schema validation failure', async () => {
    mockGenerateJson.mockResolvedValueOnce(JSON.stringify({ passed: 'yes' })) // wrong type
    await expect(verifyMigration(migratedFiles, plan, source, target)).rejects.toThrow('schema validation')
  })
})
