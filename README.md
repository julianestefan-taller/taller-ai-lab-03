# Migration Agent — Lab 03

An AI-powered code migration tool built with Next.js App Router and the Gemini API. Users paste source files, select a source and target framework, and the agent migrates the code through four phases: **Analysis → Planning → Execution → Verification** — with live progress streaming, human approval gate, parallel step execution, and automatic rollback on failure.

**Live demo:** https://taller-ai-lab-03.vercel.app

---

## Features

| Feature | Details |
|---|---|
| 4-phase agent | Analysis, Planning, Execution, Verification — each LLM call, each Zod-validated |
| Streaming progress | NDJSON event stream; UI updates live as each phase/step completes |
| Human approval | Optional gate between Planning and Execution to review/accept the plan |
| Parallel execution | Independent migration steps run concurrently via `Promise.allSettled` |
| Rollback | Snapshot taken before each dependency level; restored on failure |
| Multi-framework | 14 frameworks across backend (Express, Fastify, Hono, Flask, FastAPI…) and frontend (React, Vue, Svelte) |
| Diff view | Per-file before/after diff rendered in the UI (pure LCS diff, no dependency) |
| Dual-mode API | `stream:true` → NDJSON; `stream:false` (default) → buffered JSON — same endpoint |

---

## Architecture

```
src/
├── app/
│   ├── page.tsx                        # Client component — file editor, phase tracker,
│   │                                   #   plan viewer, diff output
│   └── api/
│       ├── migrate/route.ts            # POST — analysis+planning (+exec if no approval)
│       ├── execute/route.ts            # POST — resume: execution+verification
│       ├── frameworks/route.ts         # GET  — framework registry for UI dropdowns
│       └── health/route.ts             # GET  — health check
└── lib/
    ├── gemini.ts                       # Lazy Gemini client; generateJson() wrapper
    ├── schemas.ts                      # All Zod schemas + AgentEvent union type
    ├── frameworks.ts                   # Framework registry + combo validation
    ├── diff.ts                         # Pure LCS line-diff (no extra dependency)
    ├── ndjson.ts                       # AsyncGenerator → streaming Response
    └── agent/
        ├── graph.ts                    # Kahn's topological levels (parallel groups)
        ├── analyze.ts                  # Phase 1: analyzeSource()
        ├── plan.ts                     # Phase 2: createPlan()
        ├── execute.ts                  # Phase 3: executePlan() — parallel + rollback
        ├── verify.ts                   # Phase 4: verifyMigration()
        └── orchestrator.ts             # Async generators composing all 4 phases
```

---

## Design Decisions

### Four-phase agent with async generator orchestration

Each phase is a pure async function (`analyzeSource`, `createPlan`, `executePlan`, `verifyMigration`) that calls Gemini once, validates output with Zod, and returns a typed value. The orchestrator in `orchestrator.ts` is an **async generator** that `yield`s `AgentEvent` objects as phases complete — one generator per pipeline. This makes the streaming seam trivial: `ndjson.ts` wraps any `AsyncGenerator<AgentEvent>` into a `ReadableStream`; tests collect events with `for await`.

### Every LLM output is Zod-validated

Each phase call: `generateJson()` → `JSON.parse()` → `SomeSchema.safeParse()`. If the model returns an unexpected shape, the phase throws, the orchestrator emits an `error` event, and the route responds with 502. No untyped data flows to the client. All TypeScript types in the codebase are `z.infer<typeof ...>` — one source of truth.

### Lazy Gemini client initialization

`gemini.ts` initializes `GoogleGenAI` on first call, not at module evaluation. This is critical for Next.js: the build process evaluates server modules during static page collection, and throwing on import crashes the build when `GEMINI_API_KEY` is absent (e.g. in CI or preview environments before env vars are set).

### Parallel execution via topological levels (Kahn's algorithm)

`graph.ts` partitions steps into **levels**: steps in the same level have no inter-dependencies and are safe to run concurrently. `execute.ts` runs each level with `Promise.allSettled`, so a 3-step migration where steps 1 and 2 are independent of each other both run in a single `await`. Cycle detection throws early with a clear error before execution starts.

### Rollback via snapshot stack

Before each topological level executes, `execute.ts` pushes a `Map<filename, code>` snapshot onto a stack. If any step in a level fails, the snapshot is popped and restored, all downstream steps are marked `skipped`, and `rolledBack: true` is set on the result. The original files are never modified in place — `currentFiles` is a working copy; the user's input `files` array is immutable.

### Human approval gate (Ext 3)

When `requireApproval: true`, the `runMigration` generator stops after planning and yields `{ type: 'awaiting_approval', analysis, plan }`. The UI presents the plan for review; on approval it sends the (possibly edited) plan to `POST /api/execute`. This means the full analysis+plan state is round-tripped through the client — stateless server, no session storage needed.

### Dual-mode API (stream + buffered JSON)

`POST /api/migrate` accepts `stream: boolean`. With `stream: true` (what the UI uses), the generator is piped through `agentEventStream()` directly — no buffering, events flow as they're produced. With `stream: false` (default; `curl`/grading), `collectEvents()` buffers all events and returns the final `result` event as a single JSON response. Same generator, same validation, two presentation modes.

### In-house LCS diff — no dependency

`diff.ts` implements a standard O(n×m) LCS diff. At the scale of migration files (hundreds of lines) this is fast enough and avoids pulling in a diff library that would inflate the bundle. Fully unit-tested with edge cases (empty inputs, single-line changes, identical files).

### `.npmrc` with public registry override

The home `~/.npmrc` routes all npm traffic through a private Artifactory registry. This file overrides it to `https://registry.npmjs.org/` so `package-lock.json` records public URLs. Without this, Vercel cannot fetch the locked packages at deploy time.

---

## Local Setup

```bash
# 1. Install dependencies
npm install

# 2. Create env file
cp .env.local.example .env.local
# Fill in GEMINI_API_KEY

# 3. Run the dev server
npm run dev
```

### Environment variables

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google AI Studio API key — server-only, never `NEXT_PUBLIC_` |

---

## Tests

```bash
npm test          # run once
npm run test:watch  # watch mode
```

66 tests across 13 suites:

| Suite | What it covers |
|---|---|
| `lib/__tests__/frameworks.test.ts` | Registry lookups, valid/invalid combos, categories |
| `lib/__tests__/diff.test.ts` | LCS diff: add/remove/unchanged, edge cases |
| `lib/__tests__/schemas.test.ts` | Request + plan + result validation, rejection paths |
| `lib/agent/__tests__/graph.test.ts` | Topological levels, parallel grouping, cycle detection |
| `lib/agent/__tests__/analyze.test.ts` | Happy path, non-JSON, schema rejection (Gemini mocked) |
| `lib/agent/__tests__/plan.test.ts` | Valid plan, bad-shape rejection |
| `lib/agent/__tests__/execute.test.ts` | Status transitions, parallel ordering, rollback, progress callbacks |
| `lib/agent/__tests__/verify.test.ts` | Pass/fail, schema rejection |
| `lib/agent/__tests__/orchestrator.test.ts` | Full flow, approval gate, error propagation |
| `app/api/migrate/__tests__/route.test.ts` | 400 paths, buffered result, 502 on no result |
| `app/api/execute/__tests__/route.test.ts` | 400 paths, buffered result, 502 on no result |
| `app/api/health/__tests__/route.test.ts` | Status + timestamp |
| `app/api/frameworks/__tests__/route.test.ts` | Framework list shape |

---

## Deployment

Auto-deploys to Vercel on push to `main`. Set `GEMINI_API_KEY` in Vercel project environment variables.
