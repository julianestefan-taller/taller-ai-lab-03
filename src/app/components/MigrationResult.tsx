import type { MigrationResult as MigrationResultData } from '@/lib/schemas'
import { downloadMigratedZip } from '@/lib/workspace'
import { StepList } from './StepList'
import { DiffView } from './DiffView'

export function MigrationResult({
  result,
  targetId,
  onReset,
}: {
  result: MigrationResultData
  targetId: string
  onReset: () => void
}) {
  return (
    <div className="space-y-6">

      {/* Summary + download */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-white">Migration Result</h2>
            <span className={`text-xs rounded px-2 py-0.5 border font-medium ${
              result.success
                ? 'bg-green-900/40 text-green-300 border-green-700/40'
                : 'bg-red-900/40 text-red-300 border-red-700/40'
            }`}>
              {result.success ? 'success' : 'failed'}
            </span>
          </div>

          {/* ZIP download — shown when there are migrated files */}
          {result.migratedFiles.length > 0 && (
            <button
              type="button"
              onClick={() => downloadMigratedZip(result.migratedFiles, `migrated-${targetId}.zip`)}
              className="px-4 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white text-sm font-medium transition-colors flex items-center gap-2"
            >
              <span>↓</span>
              Download .zip ({result.migratedFiles.length} files)
            </button>
          )}
        </div>

        {result.rolledBack && (
          <p className="text-sm text-yellow-300 mb-3">
            ⚠ Migration was rolled back due to step failure.
          </p>
        )}
        <p className="text-slate-300 text-sm leading-relaxed">
          {result.verification.report}
        </p>
      </div>

      {/* Plan steps */}
      <div>
        <h2 className="text-base font-semibold text-white mb-3">Executed Plan</h2>
        <StepList
          steps={result.plan.steps.map((s) => ({
            id: s.id,
            title: s.title,
            status: s.status,
          }))}
        />
      </div>

      {/* Verification checks */}
      {result.verification.checks.length > 0 && (
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
          <h2 className="text-base font-semibold text-white mb-3">Verification Checks</h2>
          <div className="space-y-2">
            {result.verification.checks.map((c, i) => (
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
      {result.verification.remainingIssues.length > 0 && (
        <div className="rounded-2xl bg-yellow-900/20 border border-yellow-500/20 p-5">
          <h2 className="text-base font-semibold text-white mb-3">Remaining Issues</h2>
          <ul className="space-y-1.5">
            {result.verification.remainingIssues.map((issue, i) => (
              <li key={i} className="text-sm text-yellow-200 flex gap-2">
                <span className="text-yellow-400 shrink-0">!</span>
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Migrated files with diff */}
      {result.migratedFiles.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-white mb-3">
            Migrated Files
            <span className="ml-2 text-sm text-slate-500 font-normal">(click to expand diff)</span>
          </h2>
          <div className="space-y-2">
            {result.migratedFiles.map((f, i) => (
              <DiffView key={i} file={f} />
            ))}
          </div>
        </div>
      )}

      {/* Errors */}
      {result.errors.length > 0 && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4">
          <h2 className="text-sm font-semibold text-red-300 mb-2">Errors</h2>
          {result.errors.map((e, i) => (
            <p key={i} className="text-xs text-red-400 font-mono">{e}</p>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onReset}
        className="px-6 py-2 rounded-xl border border-white/20 text-slate-400 hover:text-white hover:border-white/40 text-sm transition-colors"
      >
        Start new migration
      </button>
    </div>
  )
}
