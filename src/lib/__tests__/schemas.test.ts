import { describe, it, expect } from 'vitest'
import {
  MigrateRequestSchema,
  ExecuteRequestSchema,
  MigrationPlanSchema,
  MigrationResultSchema,
  AnalysisResultSchema,
} from '../schemas'

const validFile = { name: 'app.ts', code: 'const x = 1' }

describe('MigrateRequestSchema', () => {
  it('accepts a valid request', () => {
    const r = MigrateRequestSchema.safeParse({
      files: [validFile],
      sourceFramework: 'express',
      targetFramework: 'fastify',
    })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.requireApproval).toBe(false)
      expect(r.data.stream).toBe(false)
    }
  })

  it('rejects same source and target', () => {
    const r = MigrateRequestSchema.safeParse({
      files: [validFile],
      sourceFramework: 'express',
      targetFramework: 'express',
    })
    expect(r.success).toBe(false)
  })

  it('rejects cross-category combo', () => {
    const r = MigrateRequestSchema.safeParse({
      files: [validFile],
      sourceFramework: 'express',
      targetFramework: 'react',
    })
    expect(r.success).toBe(false)
  })

  it('rejects empty files array', () => {
    const r = MigrateRequestSchema.safeParse({
      files: [],
      sourceFramework: 'express',
      targetFramework: 'fastify',
    })
    expect(r.success).toBe(false)
  })

  it('rejects more than 25 files', () => {
    const r = MigrateRequestSchema.safeParse({
      files: Array.from({ length: 26 }, (_, i) => ({ name: `f${i}.ts`, code: 'x' })),
      sourceFramework: 'express',
      targetFramework: 'fastify',
    })
    expect(r.success).toBe(false)
  })

  it('rejects file with empty code', () => {
    const r = MigrateRequestSchema.safeParse({
      files: [{ name: 'app.ts', code: '' }],
      sourceFramework: 'express',
      targetFramework: 'fastify',
    })
    expect(r.success).toBe(false)
  })

  it('rejects file with code exceeding 50k chars', () => {
    const r = MigrateRequestSchema.safeParse({
      files: [{ name: 'big.ts', code: 'x'.repeat(50_001) }],
      sourceFramework: 'express',
      targetFramework: 'fastify',
    })
    expect(r.success).toBe(false)
  })
})

describe('MigrationPlanSchema', () => {
  it('accepts a valid plan', () => {
    const r = MigrationPlanSchema.safeParse({
      steps: [
        {
          id: 0,
          title: 'Replace imports',
          description: 'Swap express imports for fastify',
          dependsOn: [],
          complexity: 'low',
          targetFiles: ['app.ts'],
          status: 'pending',
        },
      ],
      notes: ['Remember to update types'],
    })
    expect(r.success).toBe(true)
  })

  it('rejects empty steps', () => {
    const r = MigrationPlanSchema.safeParse({ steps: [], notes: [] })
    expect(r.success).toBe(false)
  })
})

describe('AnalysisResultSchema', () => {
  it('accepts a valid analysis', () => {
    const r = AnalysisResultSchema.safeParse({
      summary: 'A simple Express app',
      detectedPatterns: ['MVC routing'],
      dependencies: ['express'],
      potentialIssues: [],
      filesOverview: [{ name: 'app.ts', role: 'entry point', language: 'TypeScript' }],
    })
    expect(r.success).toBe(true)
  })
})

describe('ExecuteRequestSchema', () => {
  it('accepts valid execute body', () => {
    const r = ExecuteRequestSchema.safeParse({
      files: [validFile],
      sourceFramework: 'express',
      targetFramework: 'fastify',
      analysis: { summary: 'ok', detectedPatterns: [], dependencies: [], potentialIssues: [], filesOverview: [] },
      plan: { steps: [{ id: 0, title: 'T', description: 'D', dependsOn: [], complexity: 'low', targetFiles: [], status: 'pending' }], notes: [] },
    })
    expect(r.success).toBe(true)
  })
})

describe('MigrationResultSchema', () => {
  it('accepts a valid result', () => {
    const r = MigrationResultSchema.safeParse({
      success: true,
      migratedFiles: [],
      plan: {
        steps: [{ id: 0, title: 'T', description: 'D', dependsOn: [], complexity: 'low', targetFiles: [], status: 'completed' }],
        notes: [],
      },
      verification: {
        passed: true,
        checks: [{ name: 'imports', passed: true, detail: 'ok' }],
        remainingIssues: [],
        report: 'All good.',
      },
      errors: [],
      rolledBack: false,
    })
    expect(r.success).toBe(true)
  })
})
