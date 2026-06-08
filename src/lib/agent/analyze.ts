import { generateJson } from '../gemini'
import { AnalysisResultSchema, type AnalysisResult, type FileInput } from '../schemas'
import type { Framework } from '../frameworks'

const SYSTEM_PROMPT = `\
You are a senior software architect specializing in framework migrations. \
Analyze the provided source code and return a single JSON object that strictly conforms to the schema below. \
Do NOT include any text outside the JSON object.

## Output schema
{
  "summary": "<2-4 sentence overview of the codebase>",
  "detectedPatterns": ["<pattern name>", ...],
  "dependencies": ["<package or module name>", ...],
  "potentialIssues": ["<issue description>", ...],
  "filesOverview": [
    { "name": "<filename>", "role": "<what this file does>", "language": "<detected language>" }
  ]
}

## Guidelines
- detectedPatterns: note architectural and design patterns (e.g. "MVC routing", "middleware chain", "dependency injection")
- dependencies: list all external packages/imports found, not standard library
- potentialIssues: anything that will be tricky to migrate (e.g. "uses Express-specific req.locals", "relies on Django ORM", "uses framework-specific decorators")
- filesOverview: one entry per submitted file

Return valid JSON only. No markdown fences, no prose.`

function buildUserMessage(files: FileInput[], source: Framework, target: Framework): string {
  const header = `Analyze these files for migration from ${source.label} (${source.language}) to ${target.label} (${target.language}):\n\n`
  const parts = files.map((f) => `### File: ${f.name}\n\`\`\`\n${f.code}\n\`\`\``)
  return header + parts.join('\n\n')
}

export async function analyzeSource(
  files: FileInput[],
  source: Framework,
  target: Framework
): Promise<AnalysisResult> {
  const raw = await generateJson(SYSTEM_PROMPT, buildUserMessage(files, source, target))

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('LLM returned non-JSON response during analysis')
  }

  const result = AnalysisResultSchema.safeParse(parsed)
  if (!result.success) {
    throw new Error(`Analysis response failed schema validation: ${result.error.message}`)
  }

  return result.data
}
