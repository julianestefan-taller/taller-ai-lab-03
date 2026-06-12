import type { Framework } from '@/lib/frameworks'

export function FrameworkSelectors({
  frameworks,
  sourceId,
  targetId,
  onSourceChange,
  onTargetChange,
}: {
  frameworks: Framework[]
  sourceId: string
  targetId: string
  onSourceChange: (id: string) => void
  onTargetChange: (id: string) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="rounded-xl bg-white/5 border border-white/10 p-4">
        <label className="block text-xs text-slate-400 mb-2">Source Framework</label>
        <select
          value={sourceId}
          onChange={(e) => onSourceChange(e.target.value)}
          className="w-full bg-slate-800 border border-white/10 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">Select source…</option>
          {frameworks.map((f) => (
            <option key={f.id} value={f.id}>{f.label} ({f.language})</option>
          ))}
        </select>
      </div>
      <div className="rounded-xl bg-white/5 border border-white/10 p-4">
        <label className="block text-xs text-slate-400 mb-2">Target Framework</label>
        <select
          value={targetId}
          onChange={(e) => onTargetChange(e.target.value)}
          className="w-full bg-slate-800 border border-white/10 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">Select target…</option>
          {frameworks.filter((f) => f.id !== sourceId).map((f) => (
            <option key={f.id} value={f.id}>{f.label} ({f.language})</option>
          ))}
        </select>
      </div>
    </div>
  )
}
