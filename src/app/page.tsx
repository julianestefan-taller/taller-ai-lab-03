'use client'

import { useState, useEffect } from 'react'
import type {
  MigrationResult,
  MigrationPlan,
  AnalysisResult,
  AgentEvent,
  StepStatus,
  MigratedFile,
} from '@/lib/schemas'
import type { Framework } from '@/lib/frameworks'
import { lineDiff } from '@/lib/diff'

// ---- Types ------------------------------------------------------------------

interface FileEntry {
  id: string
  name: string
  code: string
}

type Phase = 'analysis' | 'planning' | 'execution' | 'verification'
type PhaseStatus = 'idle' | 'running' | 'done' | 'error'

interface PhaseState {
  status: PhaseStatus
}

interface StepState {
  id: number
  title: string
  status: StepStatus
}

type AppState =
  | { kind: 'idle' }
  | { kind: 'running'; phases: Record<Phase, PhaseState>; steps: StepState[]; currentPhase: Phase }
  | { kind: 'awaiting_approval'; analysis: AnalysisResult; plan: MigrationPlan }
  | { kind: 'done'; result: MigrationResult }
  | { kind: 'error'; message: string }

// ---- Helpers ----------------------------------------------------------------

function uid() {
  return Math.random().toString(36).slice(2)
}

const PHASE_LABELS: Record<Phase, string> = {
  analysis: 'Analysis',
  planning: 'Planning',
  execution: 'Execution',
  verification: 'Verification',
}

const PHASES: Phase[] = ['analysis', 'planning', 'execution', 'verification']

const STATUS_COLORS: Record<StepStatus, string> = {
  pending: 'text-slate-500',
  in_progress: 'text-yellow-400',
  completed: 'text-green-400',
  failed: 'text-red-400',
  skipped: 'text-slate-600',
}

const STATUS_DOT: Record<StepStatus, string> = {
  pending: 'bg-slate-600',
  in_progress: 'bg-yellow-400 animate-pulse',
  completed: 'bg-green-400',
  failed: 'bg-red-400',
  skipped: 'bg-slate-700',
}

// ---- Sub-components ---------------------------------------------------------

function PhaseTracker({ phases, current }: { phases: Record<Phase, PhaseState>; current: Phase }) {
  return (
    <div className="flex items-center gap-1 text-xs flex-wrap">
      {PHASES.map((p, i) => {
        const st = phases[p].status
        return (
          <div key={p} className="flex items-center gap-1">
            <span
              className={
                st === 'done'
                  ? 'text-green-400'
                  : st === 'running'
                    ? 'text-yellow-400 animate-pulse'
                    : st === 'error'
                      ? 'text-red-400'
                      : p === current
                        ? 'text-indigo-400'
                        : 'text-slate-600'
              }
            >
              {PHASE_LABELS[p]}
            </span>
            {i < PHASES.length - 1 && <span className="text-slate-700">→</span>}
          </div>
        )
      })}
    </div>
  )
}

function StepList({ steps }: { steps: StepState[] }) {
  if (steps.length === 0) return null
  return (
    <div className="space-y-1.5 mt-3">
      {steps.map((s) => (
        <div key={s.id} className="flex items-center gap-2 text-sm">
          <span className={`h-2 w-2 rounded-full shrink-0 ${STATUS_DOT[s.status]}`} />
          <span className={`flex-1 ${STATUS_COLORS[s.status]}`}>{s.title}</span>
          <span className="text-xs text-slate-600 uppercase">{s.status.replace('_', ' ')}</span>
        </div>
      ))}
    </div>
  )
}

function DiffView({ file }: { file: MigratedFile }) {
  const [open, setOpen] = useState(false)
  const lines = lineDiff(file.originalCode, file.migratedCode)

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2 bg-white/5 hover:bg-white/8 text-sm text-slate-300 transition-colors"
      >
        <span className="font-mono font-medium">{file.name}</span>
        <span className="text-slate-500 text-xs">{open ? '▲ hide diff' : '▼ show diff'}</span>
      </button>
      {open && (
        <div className="font-mono text-xs overflow-x-auto max-h-96 overflow-y-auto">
          {lines.map((l, i) => (
            <div
              key={i}
              className={
                l.type === 'added'
                  ? 'bg-green-900/30 text-green-300'
                  : l.type === 'removed'
                    ? 'bg-red-900/30 text-red-300 line-through'
                    : 'text-slate-500'
              }
            >
              <span className="select-none px-2 text-slate-600 border-r border-white/5 inline-block w-6 text-right mr-2">
                {l.type === 'added' ? '+' : l.type === 'removed' ? '-' : ' '}
              </span>
              <span className="whitespace-pre">{l.content}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PlanViewer({
  plan,
  onApprove,
  onReject,
}: {
  plan: MigrationPlan
  onApprove: (plan: MigrationPlan) => void
  onReject: () => void
}) {
  const [editedPlan, setEditedPlan] = useState(plan)

  return (
    <div className="rounded-2xl bg-white/5 border border-indigo-500/30 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Review Migration Plan</h2>
        <span className="text-xs text-indigo-300 bg-indigo-900/40 border border-indigo-700/40 rounded px-2 py-0.5">
          awaiting approval
        </span>
      </div>
      <div className="space-y-2">
        {editedPlan.steps.map((step) => (
          <div key={step.id} className="rounded-lg bg-white/5 border border-white/10 p-3 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-mono">#{step.id}</span>
              <span className="text-sm font-medium text-white">{step.title}</span>
              <span
                className={`ml-auto text-xs rounded px-1.5 py-0.5 ${
                  step.complexity === 'high'
                    ? 'bg-red-900/40 text-red-300'
                    : step.complexity === 'medium'
                      ? 'bg-yellow-900/40 text-yellow-300'
                      : 'bg-green-900/40 text-green-300'
                }`}
              >
                {step.complexity}
              </span>
            </div>
            <p className="text-xs text-slate-400">{step.description}</p>
            {step.dependsOn.length > 0 && (
              <p className="text-xs text-slate-600">depends on: #{step.dependsOn.join(', #')}</p>
            )}
          </div>
        ))}
      </div>
      {editedPlan.notes.length > 0 && (
        <div className="text-xs text-slate-400 space-y-1">
          <p className="font-medium text-slate-300">Notes</p>
          {editedPlan.notes.map((n, i) => (
            <p key={i}>• {n}</p>
          ))}
        </div>
      )}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => onApprove(editedPlan)}
          className="flex-1 py-2 rounded-xl bg-green-700 hover:bg-green-600 text-white font-semibold text-sm transition-colors"
        >
          Approve & Execute
        </button>
        <button
          type="button"
          onClick={onReject}
          className="px-5 py-2 rounded-xl border border-white/20 text-slate-400 hover:text-white hover:border-white/40 text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
      {/* suppress unused setter lint */}
      <input type="hidden" onChange={() => setEditedPlan(editedPlan)} />
    </div>
  )
}

// ---- Main page --------------------------------------------------------------

export default function Home() {
  const [frameworks, setFrameworks] = useState<Framework[]>([])
  const [files, setFiles] = useState<FileEntry[]>([{ id: uid(), name: 'app.ts', code: '' }])
  const [sourceId, setSourceId] = useState('')
  const [targetId, setTargetId] = useState('')
  const [requireApproval, setRequireApproval] = useState(false)
  const [appState, setAppState] = useState<AppState>({ kind: 'idle' })

  useEffect(() => {
    fetch('/api/frameworks')
      .then((r) => r.json())
      .then((d) => {
        setFrameworks(d.frameworks ?? [])
        if (d.frameworks?.length >= 2) {
          setSourceId(d.frameworks[0].id)
          setTargetId(d.frameworks[1].id)
        }
      })
      .catch(() => {})
  }, [])

  function addFile() {
    setFiles((prev) => [...prev, { id: uid(), name: 'file.ts', code: '' }])
  }

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  function updateFile(id: string, patch: Partial<Omit<FileEntry, 'id'>>) {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  }

  function initPhases(): Record<Phase, PhaseState> {
    return {
      analysis: { status: 'idle' },
      planning: { status: 'idle' },
      execution: { status: 'idle' },
      verification: { status: 'idle' },
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const nonEmpty = files.filter((f) => f.code.trim())
    if (!nonEmpty.length || !sourceId || !targetId) return

    const phases = initPhases()
    setAppState({ kind: 'running', phases, steps: [], currentPhase: 'analysis' })

    await streamMigration('/api/migrate', {
      files: nonEmpty.map((f) => ({ name: f.name || 'unnamed.ts', code: f.code })),
      sourceFramework: sourceId,
      targetFramework: targetId,
      requireApproval,
      stream: true,
    })
  }

  async function handleApprove(plan: MigrationPlan) {
    if (appState.kind !== 'awaiting_approval') return
    const { analysis } = appState

    const nonEmpty = files.filter((f) => f.code.trim())
    const phases = initPhases()
    phases.analysis.status = 'done'
    phases.planning.status = 'done'
    setAppState({ kind: 'running', phases, steps: [], currentPhase: 'execution' })

    await streamMigration('/api/execute', {
      files: nonEmpty.map((f) => ({ name: f.name || 'unnamed.ts', code: f.code })),
      sourceFramework: sourceId,
      targetFramework: targetId,
      analysis,
      plan,
      stream: true,
    })
  }

  function handleReject() {
    setAppState({ kind: 'idle' })
  }

  async function streamMigration(url: string, body: unknown) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({ error: 'Request failed' }))
        setAppState({ kind: 'error', message: data.error ?? 'Request failed' })
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const event = JSON.parse(line) as AgentEvent
            handleEvent(event)
          } catch {
            // skip malformed line
          }
        }
      }
    } catch (err) {
      setAppState({ kind: 'error', message: err instanceof Error ? err.message : 'Network error' })
    }
  }

  function handleEvent(event: AgentEvent) {
    setAppState((prev) => {
      if (event.type === 'phase') {
        if (prev.kind !== 'running') return prev
        const phases = { ...prev.phases }
        phases[event.phase] = { status: event.status === 'started' ? 'running' : 'done' }
        return { ...prev, phases, currentPhase: event.phase }
      }

      if (event.type === 'step') {
        if (prev.kind !== 'running') return prev
        const existing = prev.steps.find((s) => s.id === event.stepId)
        if (existing) {
          return {
            ...prev,
            steps: prev.steps.map((s) =>
              s.id === event.stepId ? { ...s, status: event.status } : s
            ),
          }
        }
        return {
          ...prev,
          steps: [...prev.steps, { id: event.stepId, title: event.title, status: event.status }],
        }
      }

      if (event.type === 'awaiting_approval') {
        return { kind: 'awaiting_approval', analysis: event.analysis, plan: event.plan }
      }

      if (event.type === 'result') {
        return { kind: 'done', result: event.result }
      }

      if (event.type === 'error') {
        return { kind: 'error', message: event.message }
      }

      return prev
    })
  }

  const isRunning = appState.kind === 'running'
  const canSubmit = files.some((f) => f.code.trim()) && sourceId && targetId && sourceId !== targetId

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">Migration Agent</h1>
          <p className="text-slate-400">AI-powered code migration between frameworks — Analysis → Planning → Execution → Verification</p>
        </div>

        {/* Input form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Framework selectors */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <label className="block text-xs text-slate-400 mb-2">Source Framework</label>
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                className="w-full bg-slate-800 border border-white/10 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Select source…</option>
                {frameworks.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label} ({f.language})
                  </option>
                ))}
              </select>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <label className="block text-xs text-slate-400 mb-2">Target Framework</label>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full bg-slate-800 border border-white/10 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Select target…</option>
                {frameworks
                  .filter((f) => f.id !== sourceId)
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label} ({f.language})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* File editor */}
          {files.map((file, idx) => (
            <div key={file.id} className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border-b border-white/10">
                <input
                  type="text"
                  value={file.name}
                  onChange={(e) => updateFile(file.id, { name: e.target.value })}
                  placeholder="filename.ts"
                  className="flex-1 bg-transparent text-sm text-slate-300 placeholder-slate-600 focus:outline-none font-mono"
                />
                {files.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeFile(file.id)}
                    className="text-slate-600 hover:text-red-400 transition-colors text-lg leading-none"
                  >
                    ×
                  </button>
                )}
              </div>
              <textarea
                value={file.code}
                onChange={(e) => updateFile(file.id, { code: e.target.value })}
                placeholder={`Paste ${idx === 0 ? 'your' : 'another'} source code here…`}
                rows={10}
                className="w-full bg-transparent text-sm text-slate-200 placeholder-slate-700 font-mono p-4 focus:outline-none resize-y"
                spellCheck={false}
              />
            </div>
          ))}

          {/* Controls row */}
          <div className="flex items-center gap-3 flex-wrap">
            {files.length < 10 && (
              <button
                type="button"
                onClick={addFile}
                className="px-4 py-2.5 rounded-xl border border-white/20 text-slate-400 hover:text-white hover:border-white/40 text-sm transition-colors"
              >
                + Add file
              </button>
            )}
            <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer select-none ml-auto">
              <input
                type="checkbox"
                checked={requireApproval}
                onChange={(e) => setRequireApproval(e.target.checked)}
                className="accent-indigo-500"
              />
              Require plan approval
            </label>
            <button
              type="submit"
              disabled={isRunning || !canSubmit}
              className="px-8 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center gap-2"
            >
              {isRunning ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Migrating…
                </>
              ) : (
                'Migrate'
              )}
            </button>
          </div>
        </form>

        {/* Live progress */}
        {appState.kind === 'running' && (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-3">
            <PhaseTracker phases={appState.phases} current={appState.currentPhase} />
            <StepList steps={appState.steps} />
          </div>
        )}

        {/* Awaiting approval */}
        {appState.kind === 'awaiting_approval' && (
          <PlanViewer
            plan={appState.plan}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}

        {/* Error */}
        {appState.kind === 'error' && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            {appState.message}
          </div>
        )}

        {/* Results */}
        {appState.kind === 'done' && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-white">Migration Result</h2>
                <span
                  className={`text-xs rounded px-2 py-0.5 border font-medium ${
                    appState.result.success
                      ? 'bg-green-900/40 text-green-300 border-green-700/40'
                      : 'bg-red-900/40 text-red-300 border-red-700/40'
                  }`}
                >
                  {appState.result.success ? 'success' : 'failed'}
                </span>
              </div>
              {appState.result.rolledBack && (
                <p className="text-sm text-yellow-300 mb-3">
                  ⚠ Migration was rolled back due to step failure.
                </p>
              )}
              <p className="text-slate-300 text-sm leading-relaxed">
                {appState.result.verification.report}
              </p>
            </div>

            {/* Plan steps */}
            <div>
              <h2 className="text-base font-semibold text-white mb-3">Executed Plan</h2>
              <StepList steps={appState.result.plan.steps.map((s) => ({ id: s.id, title: s.title, status: s.status }))} />
            </div>

            {/* Verification checks */}
            {appState.result.verification.checks.length > 0 && (
              <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
                <h2 className="text-base font-semibold text-white mb-3">Verification Checks</h2>
                <div className="space-y-2">
                  {appState.result.verification.checks.map((c, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className={c.passed ? 'text-green-400' : 'text-red-400'}>
                        {c.passed ? '✓' : '✗'}
                      </span>
                      <div>
                        <span className="text-slate-300 font-medium">{c.name}</span>
                        <span className="text-slate-500 ml-2 text-xs">{c.detail}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Remaining issues */}
            {appState.result.verification.remainingIssues.length > 0 && (
              <div className="rounded-2xl bg-yellow-900/20 border border-yellow-500/20 p-5">
                <h2 className="text-base font-semibold text-white mb-3">Remaining Issues</h2>
                <ul className="space-y-1.5">
                  {appState.result.verification.remainingIssues.map((issue, i) => (
                    <li key={i} className="text-sm text-yellow-200 flex gap-2">
                      <span className="text-yellow-400 shrink-0">!</span>
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Migrated files with diff */}
            {appState.result.migratedFiles.length > 0 && (
              <div>
                <h2 className="text-base font-semibold text-white mb-3">Migrated Files</h2>
                <div className="space-y-2">
                  {appState.result.migratedFiles.map((f, i) => (
                    <DiffView key={i} file={f} />
                  ))}
                </div>
              </div>
            )}

            {/* Errors */}
            {appState.result.errors.length > 0 && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4">
                <h2 className="text-sm font-semibold text-red-300 mb-2">Errors</h2>
                {appState.result.errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-400 font-mono">
                    {e}
                  </p>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setAppState({ kind: 'idle' })}
              className="px-6 py-2 rounded-xl border border-white/20 text-slate-400 hover:text-white hover:border-white/40 text-sm transition-colors"
            >
              Start new migration
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
