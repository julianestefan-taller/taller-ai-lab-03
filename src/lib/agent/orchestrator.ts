import { analyzeSource } from './analyze'
import { createPlan } from './plan'
import { executePlan } from './execute'
import { verifyMigration } from './verify'
import type { AgentEvent, FileInput, MigrationPlan, AnalysisResult } from '../schemas'
import type { Framework } from '../frameworks'

export interface RunMigrationOptions {
  files: FileInput[]
  source: Framework
  target: Framework
  requireApproval: boolean
}

export interface ResumeExecutionOptions {
  files: FileInput[]
  source: Framework
  target: Framework
  analysis: AnalysisResult
  plan: MigrationPlan
}

export async function* runMigration(opts: RunMigrationOptions): AsyncGenerator<AgentEvent> {
  const { files, source, target, requireApproval } = opts

  // Phase 1: Analysis
  yield { type: 'phase', phase: 'analysis', status: 'started' }
  let analysis: AnalysisResult
  try {
    analysis = await analyzeSource(files, source, target)
  } catch (err) {
    yield { type: 'error', message: err instanceof Error ? err.message : 'Analysis failed' }
    return
  }
  yield { type: 'phase', phase: 'analysis', status: 'completed' }

  // Phase 2: Planning
  yield { type: 'phase', phase: 'planning', status: 'started' }
  let plan: MigrationPlan
  try {
    plan = await createPlan(files, source, target, analysis)
  } catch (err) {
    yield { type: 'error', message: err instanceof Error ? err.message : 'Planning failed' }
    return
  }
  yield { type: 'phase', phase: 'planning', status: 'completed' }

  // Ext 3: Human approval gate
  if (requireApproval) {
    yield { type: 'awaiting_approval', analysis, plan }
    return
  }

  yield* resumeExecution({ files, source, target, analysis, plan })
}

export async function* resumeExecution(opts: ResumeExecutionOptions): AsyncGenerator<AgentEvent> {
  const { files, source, target, analysis, plan } = opts

  // Phase 3: Execution
  yield { type: 'phase', phase: 'execution', status: 'started' }

  let execResult: Awaited<ReturnType<typeof executePlan>>
  try {
    execResult = await executePlan(files, plan, source, target, {
      onStepStart: () => {},
      onStepComplete: () => {},
      onStepFail: () => {},
    })

    // Emit step status events after execution
    for (const step of execResult.plan.steps) {
      yield { type: 'step', stepId: step.id, title: step.title, status: step.status }
    }
  } catch (err) {
    yield { type: 'error', message: err instanceof Error ? err.message : 'Execution failed' }
    return
  }
  yield { type: 'phase', phase: 'execution', status: 'completed' }

  if (execResult.rolledBack) {
    yield {
      type: 'result',
      result: {
        success: false,
        migratedFiles: execResult.migratedFiles,
        plan: execResult.plan,
        verification: {
          passed: false,
          checks: [],
          remainingIssues: ['Migration was rolled back due to step failure'],
          report: 'Migration failed and was rolled back.',
        },
        errors: execResult.errors,
        rolledBack: true,
      },
    }
    return
  }

  // Phase 4: Verification
  yield { type: 'phase', phase: 'verification', status: 'started' }
  let verification: Awaited<ReturnType<typeof verifyMigration>>
  try {
    verification = await verifyMigration(
      execResult.migratedFiles,
      execResult.plan,
      source,
      target
    )
  } catch (err) {
    yield { type: 'error', message: err instanceof Error ? err.message : 'Verification failed' }
    return
  }
  yield { type: 'phase', phase: 'verification', status: 'completed' }

  yield {
    type: 'result',
    result: {
      success: verification.passed && execResult.errors.length === 0,
      migratedFiles: execResult.migratedFiles,
      plan: execResult.plan,
      verification,
      errors: execResult.errors,
      rolledBack: false,
    },
  }

  // suppress unused variable warning
  void analysis
}
