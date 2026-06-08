import { generateJson } from '../gemini'
import { VerificationResultSchema, type VerificationResult, type MigratedFile, type MigrationPlan } from '../schemas'
import type { Framework } from '../frameworks'

const SYSTEM_PROMPT = `\
You are a senior software architect verifying a completed migration. \
Analyze the migrated code and return a JSON object strictly conforming to the schema below. \
Do NOT include any text outside the JSON object.

## Output schema
{
  "passed": true | false,
  "checks": [
    { "name": "<check name>", "passed": true | false, "detail": "<explanation>" }
  ],
  "remainingIssues": ["<issue description>", ...],
  "report": "<2-4 sentence overall migration quality assessment>"
}

## Checks to perform
1. framework_imports_updated — all source framework imports replaced with target framework equivalents
2. no_source_framework_remnants — no leftover source framework specific APIs or patterns
3. code_compiles — code appears syntactically valid and types/interfaces are consistent
4. functionality_preserved — migrated code appears to preserve the original functionality
5. idioms_adopted — code uses target framework idioms (routing style, middleware pattern, etc.)

- passed: true only if ALL checks pass and there are no critical remaining issues
- remainingIssues: list anything that needs manual follow-up after migration
- report: honest summary of migration quality

Return valid JSON only. No markdown fences, no prose.`

function buildUserMessage(
  migratedFiles: MigratedFile[],
  source: Framework,
  target: Framework,
  plan: MigrationPlan
): string {
  const filesSection = migratedFiles
    .map((f) => `### ${f.name} (step ${f.stepId})\n\`\`\`\n${f.migratedCode}\n\`\`\``)
    .join('\n\n')

  return `Verify this migration from ${source.label} to ${target.label}.

## Migration plan notes
${plan.notes.join('\n')}

## Migrated files
${filesSection}`
}

export async function verifyMigration(
  migratedFiles: MigratedFile[],
  plan: MigrationPlan,
  source: Framework,
  target: Framework
): Promise<VerificationResult> {
  const raw = await generateJson(
    SYSTEM_PROMPT,
    buildUserMessage(migratedFiles, source, target, plan)
  )

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('LLM returned non-JSON response during verification')
  }

  const result = VerificationResultSchema.safeParse(parsed)
  if (!result.success) {
    throw new Error(`Verification response failed schema validation: ${result.error.message}`)
  }

  return result.data
}
