<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Lab 03 — Migration Agent: Agent Context

## What this project is

An AI-powered code migration agent. Three API routes:

- `POST /api/migrate` — accepts `{ files, sourceFramework, targetFramework, requireApproval?, stream? }`, runs Analysis+Planning (and Execution+Verification if `requireApproval` is false)
- `POST /api/execute` — resumes after human approval: accepts `{ files, sourceFramework, targetFramework, analysis, plan, stream? }`, runs Execution+Verification
- `GET /api/frameworks` — returns the framework registry for UI dropdowns

The pipeline is: **validate (Zod) → analyze → plan → [approval gate] → execute (parallel, rollback) → verify → stream events**.

## Rules for this codebase

### Never add `NEXT_PUBLIC_` to `GEMINI_API_KEY`

`GEMINI_API_KEY` is read only in `src/lib/gemini.ts` via `getClient()`, which is called only from server-side agent functions. Adding `NEXT_PUBLIC_` would expose the key in the client bundle.

### Keep `gemini.ts` lazy — do not throw at module evaluation

`getClient()` initializes `GoogleGenAI` on first call, not at import time. This is required so the Next.js build can evaluate the module without `GEMINI_API_KEY` being set (CI, preview environments). Do not move the API key check back to module scope.

### Every LLM output must be Zod-validated before use

Each phase (`analyze.ts`, `plan.ts`, `execute.ts`, `verify.ts`) validates the parsed JSON against its schema before returning. Do not remove or bypass these checks. A shape mismatch should surface as an error event (502 to the caller), not silently pass malformed data downstream.

### Keep `schemas.ts` as the single source of truth

All TypeScript types are `z.infer<typeof ...>` from schemas in `src/lib/schemas.ts`. If you add a field to any API response or agent state:
1. Update the Zod schema in `schemas.ts`
2. Update the corresponding system prompt's JSON schema in the agent file
3. Do not define parallel interfaces elsewhere

### Do not replace the in-memory snapshot/state with external storage

Execution state (file snapshots for rollback, working copies) lives in plain `Map`s within a single request. On Vercel serverless each request is isolated. Do not add Redis or session stores without discussing the trade-off.

### The orchestrator uses async generators — keep that boundary clean

`orchestrator.ts` exports `runMigration` and `resumeExecution` as async generators. Route handlers call these generators and either stream them (`agentEventStream`) or buffer them (`collectEvents`). Do not add HTTP logic (NextRequest/NextResponse) into the orchestrator or agent files.

## Key files

| File | Role |
|---|---|
| `src/lib/schemas.ts` | All Zod schemas + `AgentEvent` union. Source of truth for all data shapes. |
| `src/lib/frameworks.ts` | Framework registry + `isValidCombo()`. Used for Zod `.refine()` in `MigrateRequestSchema`. |
| `src/lib/gemini.ts` | Lazy Gemini client. `generateJson(system, user)` — single function consumed by all agent phases. |
| `src/lib/ndjson.ts` | `agentEventStream()` and `collectEvents()` — the streaming/buffered presentation layer. |
| `src/lib/diff.ts` | Pure LCS line-diff. No external dependency. Used by the UI diff view. |
| `src/lib/agent/graph.ts` | `buildLevels()` — Kahn's topological sort, cycle detection, parallel grouping. |
| `src/lib/agent/analyze.ts` | Phase 1: `analyzeSource()` |
| `src/lib/agent/plan.ts` | Phase 2: `createPlan()` |
| `src/lib/agent/execute.ts` | Phase 3: `executePlan()` — snapshot rollback, parallel via `Promise.allSettled` |
| `src/lib/agent/verify.ts` | Phase 4: `verifyMigration()` |
| `src/lib/agent/orchestrator.ts` | Composes all 4 phases as async generators; approval gate logic |
| `src/app/api/migrate/route.ts` | POST handler — validates, delegates to `runMigration`, streams or buffers |
| `src/app/api/execute/route.ts` | POST handler — validates, re-validates `analysis` + `plan`, delegates to `resumeExecution` |

## Testing

Tests use Vitest. The Gemini SDK (`src/lib/gemini.ts`) is mocked at module level in every agent test file using `vi.mock('../../gemini', ...)`. Route tests mock both the orchestrator and ndjson modules.

Run tests: `npm test`
