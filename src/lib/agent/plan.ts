import { generateJson } from '../gemini'
import { MigrationPlanSchema, type MigrationPlan, type AnalysisResult, type FileInput } from '../schemas'
import type { Framework } from '../frameworks'

const SYSTEM_PROMPT = `\
You are a senior software architect creating a migration plan. \
Return a single JSON object that strictly conforms to the schema below. \
Do NOT include any text outside the JSON object.

## Output schema
{
  "steps": [
    {
      "id": <integer starting at 0>,
      "title": "<concise step title, ≤60 chars>",
      "description": "<what this step does and why>",
      "dependsOn": [<ids of steps this one depends on>],
      "complexity": "low" | "medium" | "high",
      "targetFiles": ["<filename>", ...],
      "status": "pending"
    }
  ],
  "notes": ["<general migration note>", ...]
}

## Guidelines
- Each step should have a single clear responsibility
- dependsOn must reference valid step ids (integers)
- Steps with no dependencies can run in parallel
- All steps must have status "pending" in the plan
- targetFiles: list the file(s) this step modifies or creates
- Keep steps focused: prefer 3-8 steps for most migrations
- notes: list any gotchas, manual post-migration steps, or caveats

Return valid JSON only. No markdown fences, no prose.`

function buildUserMessage(
  files: FileInput[],
  source: Framework,
  target: Framework,
  analysis: AnalysisResult
): string {
  return `Create a migration plan from ${source.label} to ${target.label}.

## Analysis results
${JSON.stringify(analysis, null, 2)}

## Source files
${files.map((f) => `- ${f.name}`).join('\n')}`
}

export async function createPlan(
  files: FileInput[],
  source: Framework,
  target: Framework,
  analysis: AnalysisResult
): Promise<MigrationPlan> {
  const raw = await generateJson(SYSTEM_PROMPT, buildUserMessage(files, source, target, analysis))

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('LLM returned non-JSON response during planning')
  }

  const result = MigrationPlanSchema.safeParse(parsed)
  if (!result.success) {
    throw new Error(`Plan response failed schema validation: ${result.error.message}`)
  }

  return result.data
}
