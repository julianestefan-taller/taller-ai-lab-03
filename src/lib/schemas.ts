import { z } from 'zod'
import { FRAMEWORKS, isValidCombo } from './frameworks'

const frameworkIds = FRAMEWORKS.map((f) => f.id) as [string, ...string[]]

// ---- Request schemas --------------------------------------------------------

export const FileInputSchema = z.object({
  name: z.string().min(1).max(200),
  code: z.string().min(1).max(50_000),
})

export const MigrateRequestSchema = z
  .object({
    files: z.array(FileInputSchema).min(1).max(25),
    sourceFramework: z.enum(frameworkIds),
    targetFramework: z.enum(frameworkIds),
    requireApproval: z.boolean().optional().default(false),
    stream: z.boolean().optional().default(false),
  })
  .refine((d) => isValidCombo(d.sourceFramework, d.targetFramework), {
    message: 'Invalid source/target framework combination',
    path: ['targetFramework'],
  })

export const ExecuteRequestSchema = z.object({
  files: z.array(FileInputSchema).min(1).max(25),
  sourceFramework: z.enum(frameworkIds),
  targetFramework: z.enum(frameworkIds),
  analysis: z.unknown(), // validated downstream by AnalysisResultSchema
  plan: z.unknown(),     // validated downstream by MigrationPlanSchema
  stream: z.boolean().optional().default(false),
})

export type FileInput = z.infer<typeof FileInputSchema>
export type MigrateRequest = z.infer<typeof MigrateRequestSchema>
export type ExecuteRequest = z.infer<typeof ExecuteRequestSchema>

// ---- Agent state schemas ----------------------------------------------------

export const AnalysisResultSchema = z.object({
  summary: z.string(),
  detectedPatterns: z.array(z.string()),
  dependencies: z.array(z.string()),
  potentialIssues: z.array(z.string()),
  filesOverview: z.array(
    z.object({
      name: z.string(),
      role: z.string(),
      language: z.string(),
    })
  ),
})

const StepStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'failed', 'skipped'])

export const MigrationStepSchema = z.object({
  id: z.number().int().min(0),
  title: z.string(),
  description: z.string(),
  dependsOn: z.array(z.number().int().min(0)),
  complexity: z.enum(['low', 'medium', 'high']),
  targetFiles: z.array(z.string()),
  status: StepStatusSchema,
})

export const MigrationPlanSchema = z.object({
  steps: z.array(MigrationStepSchema).min(1),
  notes: z.array(z.string()),
})

export const MigratedFileSchema = z.object({
  name: z.string(),
  originalCode: z.string(),
  migratedCode: z.string(),
  stepId: z.number().int().min(0),
})

export const VerificationResultSchema = z.object({
  passed: z.boolean(),
  checks: z.array(
    z.object({
      name: z.string(),
      passed: z.boolean(),
      detail: z.string(),
    })
  ),
  remainingIssues: z.array(z.string()),
  report: z.string(),
})

export const MigrationResultSchema = z.object({
  success: z.boolean(),
  migratedFiles: z.array(MigratedFileSchema),
  plan: MigrationPlanSchema,
  verification: VerificationResultSchema,
  errors: z.array(z.string()),
  rolledBack: z.boolean(),
})

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>
export type MigrationStep = z.infer<typeof MigrationStepSchema>
export type StepStatus = z.infer<typeof StepStatusSchema>
export type MigrationPlan = z.infer<typeof MigrationPlanSchema>
export type MigratedFile = z.infer<typeof MigratedFileSchema>
export type VerificationResult = z.infer<typeof VerificationResultSchema>
export type MigrationResult = z.infer<typeof MigrationResultSchema>

// ---- Streaming event types --------------------------------------------------

export type AgentEvent =
  | { type: 'phase'; phase: 'analysis' | 'planning' | 'execution' | 'verification'; status: 'started' | 'completed' }
  | { type: 'step'; stepId: number; title: string; status: StepStatus }
  | { type: 'awaiting_approval'; analysis: AnalysisResult; plan: MigrationPlan }
  | { type: 'result'; result: MigrationResult }
  | { type: 'error'; message: string }
