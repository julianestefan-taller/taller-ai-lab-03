import type { FileEntry } from './types'

// Compact file list — shown when files come from a folder upload
export function CompactFileList({
  files,
  onRemove,
}: {
  files: FileEntry[]
  onRemove: (id: string) => void
}) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
      <div className="px-4 py-2 bg-white/5 border-b border-white/10 flex items-center justify-between">
        <span className="text-sm text-slate-300 font-medium">{files.length} files loaded</span>
        <span className="text-xs text-slate-500">editing disabled in workspace mode</span>
      </div>
      <div className="max-h-56 overflow-y-auto divide-y divide-white/5">
        {files.map((f) => (
          <div key={f.id} className="flex items-center gap-3 px-4 py-2 hover:bg-white/5 group">
            <span className="font-mono text-xs text-slate-300 flex-1 truncate">{f.name}</span>
            <span className="text-xs text-slate-600 shrink-0">{f.lines} lines</span>
            <button
              type="button"
              onClick={() => onRemove(f.id)}
              className="text-slate-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
              title="Remove file"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
