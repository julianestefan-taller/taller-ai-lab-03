'use client'

import { useState, useEffect, useRef } from 'react'
import type { MigrationPlan, AgentEvent } from '@/lib/schemas'
import type { Framework } from '@/lib/frameworks'
import { scanWorkspace, skippedSummary } from '@/lib/workspace'
import { PhaseTracker } from './components/PhaseTracker'
import { StepList } from './components/StepList'
import { PlanViewer } from './components/PlanViewer'
import { CompactFileList } from './components/CompactFileList'
import { FrameworkSelectors } from './components/FrameworkSelectors'
import { MigrationResult } from './components/MigrationResult'
import type { FileEntry, Phase, PhaseState, AppState } from './components/types'

// ---- Helpers ----------------------------------------------------------------

function uid() {
  return Math.random().toString(36).slice(2)
}

function countLines(code: string) {
  return code ? code.split('\n').length : 0
}

const MAX_FILES = 25

// ---- Main page --------------------------------------------------------------

export default function Home() {
  const [frameworks, setFrameworks] = useState<Framework[]>([])
  const [files, setFiles] = useState<FileEntry[]>([{ id: uid(), name: 'app.ts', code: '', lines: 0 }])
  const [sourceId, setSourceId] = useState('')
  const [targetId, setTargetId] = useState('')
  const [requireApproval, setRequireApproval] = useState(false)
  const [appState, setAppState] = useState<AppState>({ kind: 'idle' })
  const [scanNote, setScanNote] = useState<string | null>(null)
  const [isWorkspaceMode, setIsWorkspaceMode] = useState(false)

  const folderInputRef = useRef<HTMLInputElement>(null)

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

  // ---- File management

  function addFile() {
    setFiles((prev) => [...prev, { id: uid(), name: 'file.ts', code: '', lines: 0 }])
  }

  function removeFile(id: string) {
    setFiles((prev) => {
      const next = prev.filter((f) => f.id !== id)
      if (next.length === 0) {
        setIsWorkspaceMode(false)
        return [{ id: uid(), name: 'app.ts', code: '', lines: 0 }]
      }
      return next
    })
  }

  function updateFile(id: string, patch: Partial<Omit<FileEntry, 'id'>>) {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === id
          ? { ...f, ...patch, lines: countLines(patch.code ?? f.code) }
          : f
      )
    )
  }

  function clearAll() {
    setFiles([{ id: uid(), name: 'app.ts', code: '', lines: 0 }])
    setIsWorkspaceMode(false)
    setScanNote(null)
    setAppState({ kind: 'idle' })
  }

  // ---- Folder upload

  async function handleFolderUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files
    if (!fileList || fileList.length === 0) return

    const { files: scanned, skipped } = await scanWorkspace(fileList)

    if (scanned.length === 0) {
      setScanNote('No eligible code files found in the selected folder.')
      return
    }

    // Cap at MAX_FILES, keeping the first ones alphabetically
    const kept = scanned.slice(0, MAX_FILES)
    const capped = scanned.length > MAX_FILES ? scanned.length - MAX_FILES : 0

    const entries: FileEntry[] = kept.map((f) => ({
      id: uid(),
      name: f.name,
      code: f.code,
      lines: f.lines,
    }))

    setFiles(entries)
    setIsWorkspaceMode(true)

    const skipSummary = skippedSummary(skipped)
    const parts: string[] = [`${kept.length} files loaded`]
    if (capped > 0) parts.push(`${capped} more capped at ${MAX_FILES} limit`)
    if (skipSummary) parts.push(skipSummary)
    setScanNote(parts.join(' · '))

    // Reset input so the same folder can be re-selected
    e.target.value = ''
  }

  // ---- Agent state helpers

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
          } catch { /* skip malformed line */ }
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
          return { ...prev, steps: prev.steps.map((s) => s.id === event.stepId ? { ...s, status: event.status } : s) }
        }
        return { ...prev, steps: [...prev.steps, { id: event.stepId, title: event.title, status: event.status }] }
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
          <p className="text-slate-400">AI-powered code migration — Analysis → Planning → Execution → Verification</p>
        </div>

        {/* Input form */}
        <form onSubmit={handleSubmit} className="space-y-4">

          <FrameworkSelectors
            frameworks={frameworks}
            sourceId={sourceId}
            targetId={targetId}
            onSourceChange={setSourceId}
            onTargetChange={setTargetId}
          />

          {/* File input area */}
          {isWorkspaceMode ? (
            <CompactFileList files={files} onRemove={removeFile} />
          ) : (
            files.map((file, idx) => (
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
            ))
          )}

          {/* Scan note */}
          {scanNote && (
            <p className="text-xs text-slate-500 px-1">{scanNote}</p>
          )}

          {/* Controls row */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Manual add-file — only in paste mode */}
            {!isWorkspaceMode && files.length < MAX_FILES && (
              <button
                type="button"
                onClick={addFile}
                className="px-4 py-2.5 rounded-xl border border-white/20 text-slate-400 hover:text-white hover:border-white/40 text-sm transition-colors"
              >
                + Add file
              </button>
            )}

            {/* Folder upload */}
            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              className="px-4 py-2.5 rounded-xl border border-white/20 text-slate-400 hover:text-white hover:border-white/40 text-sm transition-colors flex items-center gap-2"
            >
              <span>↑</span> Upload folder
            </button>

            {/* Clear — shown when in workspace mode */}
            {isWorkspaceMode && (
              <button
                type="button"
                onClick={clearAll}
                className="px-4 py-2.5 rounded-xl border border-red-500/20 text-red-400/70 hover:text-red-400 hover:border-red-500/40 text-sm transition-colors"
              >
                Clear
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
              ) : 'Migrate'}
            </button>
          </div>
        </form>

        {/* Hidden folder input */}
        <input
          ref={folderInputRef}
          type="file"
          // @ts-expect-error — webkitdirectory is not in the standard types
          webkitdirectory=""
          multiple
          className="hidden"
          onChange={handleFolderUpload}
        />

        {/* Live progress */}
        {appState.kind === 'running' && (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-3">
            <PhaseTracker phases={appState.phases} current={appState.currentPhase} />
            <StepList steps={appState.steps} />
          </div>
        )}

        {/* Awaiting approval */}
        {appState.kind === 'awaiting_approval' && (
          <PlanViewer plan={appState.plan} onApprove={handleApprove} onReject={handleReject} />
        )}

        {/* Error */}
        {appState.kind === 'error' && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            {appState.message}
          </div>
        )}

        {/* Results */}
        {appState.kind === 'done' && (
          <MigrationResult
            result={appState.result}
            targetId={targetId}
            onReset={() => setAppState({ kind: 'idle' })}
          />
        )}
      </div>
    </main>
  )
}
