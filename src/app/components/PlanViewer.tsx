import type { MigrationPlan } from '@/lib/schemas'

export function PlanViewer({
  plan,
  onApprove,
  onReject,
}: {
  plan: MigrationPlan
  onApprove: (plan: MigrationPlan) => void
  onReject: () => void
}) {
  return (
    <div className="rounded-2xl bg-white/5 border border-indigo-500/30 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Review Migration Plan</h2>
        <span className="text-xs text-indigo-300 bg-indigo-900/40 border border-indigo-700/40 rounded px-2 py-0.5">
          awaiting approval
        </span>
      </div>
      <div className="space-y-2">
        {plan.steps.map((step) => (
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
      {plan.notes.length > 0 && (
        <div className="text-xs text-slate-400 space-y-1">
          <p className="font-medium text-slate-300">Notes</p>
          {plan.notes.map((n, i) => (
            <p key={i}>• {n}</p>
          ))}
        </div>
      )}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => onApprove(plan)}
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
    </div>
  )
}
