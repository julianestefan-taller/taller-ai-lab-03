import type { Phase, PhaseState } from './types'
import { PHASE_LABELS, PHASES } from './constants'

export function PhaseTracker({ phases, current }: { phases: Record<Phase, PhaseState>; current: Phase }) {
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
