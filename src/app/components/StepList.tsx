import type { StepState } from './types'
import { STATUS_COLORS, STATUS_DOT } from './constants'

export function StepList({ steps }: { steps: StepState[] }) {
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
