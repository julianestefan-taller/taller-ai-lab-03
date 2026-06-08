import { generateJson } from '../gemini'
import { MigratedFileSchema, type MigratedFile, type MigrationStep, type MigrationPlan, type FileInput } from '../schemas'
import { buildLevels } from './graph'
import type { Framework } from '../frameworks'
import { z } from 'zod'

const StepOutputSchema = z.object({
  files: z.array(
    z.object({
      name: z.string(),
      migratedCode: z.string(),
    })
  ),
})

const SYSTEM_PROMPT = `\
You are a senior software engineer executing a single migration step. \
Return a JSON object with the migrated file contents for this step. \
Do NOT include any text outside the JSON object.

## Output schema
{
  "files": [
    { "name": "<filename>", "migratedCode": "<complete migrated file content>" }
  ]
}

Return all files listed in targetFiles with their fully migrated content. \
Return valid JSON only. No markdown fences, no prose.`

function buildStepMessage(
  step: MigrationStep,
  files: FileInput[],
  source: Framework,
  target: Framework,
  currentFiles: Map<string, string>
): string {
  const relevant = step.targetFiles
    .map((name) => {
      const current = currentFiles.get(name)
      const original = files.find((f) => f.name === name)
      return `### ${name}\n\`\`\`\n${current ?? original?.code ?? '(new file)'}\n\`\`\``
    })
    .join('\n\n')

  return `Execute this migration step from ${source.label} to ${target.label}:

## Step: ${step.title}
${step.description}

## Files to migrate
${relevant}`
}

export interface ExecutionProgress {
  onStepStart: (step: MigrationStep) => void
  onStepComplete: (step: MigrationStep, files: MigratedFile[]) => void
  onStepFail: (step: MigrationStep, error: string) => void
}

export interface ExecutionResult {
  migratedFiles: MigratedFile[]
  plan: MigrationPlan
  errors: string[]
  rolledBack: boolean
}

export async function executePlan(
  files: FileInput[],
  plan: MigrationPlan,
  source: Framework,
  target: Framework,
  progress: ExecutionProgress
): Promise<ExecutionResult> {
  // Working state: name → current code (starts as original)
  const currentFiles = new Map<string, string>(files.map((f) => [f.name, f.code]))
  const allMigratedFiles: MigratedFile[] = []
  const errors: string[] = []
  let rolledBack = false

  // Mutable plan steps (we update status in place)
  const steps: MigrationStep[] = plan.steps.map((s) => ({ ...s }))

  // Snapshot stack for rollback (Ext 1)
  const snapshots: Map<string, string>[] = []

  const levels = buildLevels(steps)

  for (const level of levels) {
    // Take snapshot before executing this level
    snapshots.push(new Map(currentFiles))

    // Mark all in this level as in_progress
    for (const step of level) {
      step.status = 'in_progress'
      progress.onStepStart(step)
    }

    // Execute level in parallel (Ext 2)
    const results = await Promise.allSettled(
      level.map(async (step) => {
        const raw = await generateJson(
          SYSTEM_PROMPT,
          buildStepMessage(step, files, source, target, currentFiles)
        )

        let parsed: unknown
        try {
          parsed = JSON.parse(raw)
        } catch {
          throw new Error(`Step ${step.id} (${step.title}): LLM returned non-JSON`)
        }

        const validated = StepOutputSchema.safeParse(parsed)
        if (!validated.success) {
          throw new Error(`Step ${step.id} (${step.title}): invalid output shape`)
        }

        return { step, output: validated.data }
      })
    )

    let levelFailed = false
    for (let i = 0; i < results.length; i++) {
      const res = results[i]
      const step = level[i]

      if (res.status === 'fulfilled') {
        const { output } = res.value
        step.status = 'completed'

        const stepFiles: MigratedFile[] = output.files.map((f) => {
          const parsed = MigratedFileSchema.parse({
            name: f.name,
            originalCode: files.find((sf) => sf.name === f.name)?.code ?? '',
            migratedCode: f.migratedCode,
            stepId: step.id,
          })
          currentFiles.set(f.name, f.migratedCode)
          return parsed
        })

        allMigratedFiles.push(...stepFiles)
        progress.onStepComplete(step, stepFiles)
      } else {
        const message = res.reason instanceof Error ? res.reason.message : String(res.reason)
        step.status = 'failed'
        errors.push(message)
        progress.onStepFail(step, message)
        levelFailed = true
      }
    }

    if (levelFailed) {
      // Rollback: restore the snapshot taken before this level (Ext 1)
      const snapshot = snapshots[snapshots.length - 1]
      for (const [name, code] of snapshot) {
        currentFiles.set(name, code)
      }
      rolledBack = true

      // Mark all remaining steps as skipped
      const processedIds = new Set(levels.flat().slice(0, levels.indexOf(level) * level.length + level.length).map((s) => s.id))
      for (const step of steps) {
        if (!processedIds.has(step.id) && step.status === 'pending') {
          step.status = 'skipped'
        }
      }
      break
    }
  }

  return {
    migratedFiles: allMigratedFiles,
    plan: { ...plan, steps },
    errors,
    rolledBack,
  }
}
