# Migration Agent — Sample Files

Ready-to-use source files for testing the migration agent. Each folder contains realistic code demonstrating the patterns the agent needs to handle (routing, middleware, auth, error handling, state management).

---

## Suggested migration paths

| Source | Target | Files to paste | What gets migrated |
|---|---|---|---|
| `express/` → `fastify` | express → fastify | `app.ts` + `routes/users.ts` + `middleware/auth.ts` | `Router()` → plugin system; `next(err)` → `reply.code().send()`; custom types on `req` |
| `express/` → `hono` | express → hono | `app.ts` + `routes/users.ts` | `express()` → `new Hono()`; middleware chain; `res.json()` → `c.json()` |
| `express/` → `nestjs` | express → nestjs | `routes/users.ts` + `middleware/auth.ts` | Class-based controllers; decorators; DI guards |
| `koa/` → `express` | koa → express | `app.ts` | `ctx` object → `req/res`; `async (ctx, next)` middleware → `(req, res, next)` |
| `koa/` → `fastify` | koa → fastify | `app.ts` | Plugin system; schema validation; `ctx.throw` → `reply.code` |
| `flask/` → `fastapi` | flask → fastapi | `app.py` | Type annotations; `@app.get` → FastAPI path ops; Pydantic models; async handlers |
| `flask/` → `django` | flask → django | `app.py` | CBVs; Django request/response; URL patterns |
| `django/` → `fastapi` | django → fastapi | `views.py` | From CBVs + decorators to async FastAPI path functions + Pydantic |
| `react/` → `vue` | react → vue | `UserDashboard.tsx` | `useState/useEffect` → `ref/computed/onMounted`; JSX → template; props → defineProps |
| `react/` → `svelte` | react → svelte | `UserDashboard.tsx` | Reactive declarations; `{#if}` blocks; event handlers |
| `vue/` → `react` | vue → react | `ProductCatalog.vue` | `<script setup>` + template → React component + JSX; `v-model` → controlled inputs |
| `vue/` → `svelte` | vue → svelte | `ProductCatalog.vue` | SFC → Svelte component; `ref/computed` → `$:` reactive |

---

## How to use

1. Start the dev server: `npm run dev`
2. Open `http://localhost:3000`
3. Pick a source → target framework pair from the table above
4. Paste the file contents (one or more files) into the editor
5. Select the source and target frameworks in the dropdowns
6. Optionally enable **Require plan approval** to review the migration plan before execution
7. Click **Migrate**

---

## Sample files

### `express/` — Express REST API (TypeScript)
Three-file backend with middleware chain, typed Router, error propagation via `next(err)`, and `req.user` augmentation.

- `app.ts` — app setup, middleware registration, route mounting
- `routes/users.ts` — full CRUD router with typed request/response
- `middleware/auth.ts` — Bearer token auth middleware with Express type augmentation

**Key migration challenges:** `next(err)` error propagation, `req.user` declaration merging, Express-specific `Router()`.

### `koa/` — Koa REST API (TypeScript)
Single-file backend using Koa's `ctx` context object, `@koa/router`, async middleware stack, and `ctx.throw()`.

- `app.ts` — full app: middleware, router, auth, product CRUD

**Key migration challenges:** `ctx.body`/`ctx.status` vs `req/res`, generator-style middleware ordering, `ctx.throw()` vs `next(err)`.

### `flask/` — Flask task API (Python)
Classic Flask with function-based views, `@app.before_request`/`@app.after_request` hooks, custom `@require_auth` decorator, and query-param filtering.

- `app.py` — single-file app with full CRUD for a task list

**Key migration challenges:** decorator-based routing → FastAPI path decorators; `request` global → function parameter; `g` object → dependency injection.

### `django/` — Django blog API (Python)
Class-based views with `dispatch`-level decorators, manual JSON serialization, pagination, and an `HTTP_AUTHORIZATION` header check.

- `views.py` — `PostListView` + `PostDetailView` CBVs

**Key migration challenges:** CBV dispatch → FastAPI path functions; Django paginator → FastAPI skip/limit; `JsonResponse` → Pydantic response models.

### `react/` — React dashboard (TypeScript/TSX)
Multi-component React app with custom hooks (`useUsers`), controlled inputs, conditional rendering, and `fetch`-based API calls.

- `UserDashboard.tsx` — user list with search, filter, delete with confirmation

**Key migration challenges:** `useState/useEffect/useCallback` → Vue `ref/computed/onMounted`; JSX → template syntax; prop passing patterns.

### `vue/` — Vue 3 product catalog (TypeScript)
`<script setup>` SFC with `ref`, `computed`, `onMounted`, `v-model`, `v-for`, `v-if`, and a floating cart overlay.

- `ProductCatalog.vue` — filterable/sortable product grid with cart state

**Key migration challenges:** SFC template → JSX; `v-model` → controlled inputs; `v-for`/`v-if` → `map`/ternaries; `defineProps` → React props.
