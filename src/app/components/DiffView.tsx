import { useState } from 'react'
import type { MigratedFile } from '@/lib/schemas'
import { lineDiff } from '@/lib/diff'

export function DiffView({ file }: { file: MigratedFile }) {
  const [open, setOpen] = useState(false)
  const lines = lineDiff(file.originalCode, file.migratedCode)
  const added = lines.filter((l) => l.type === 'added').length
  const removed = lines.filter((l) => l.type === 'removed').length

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2 bg-white/5 hover:bg-white/8 text-sm text-slate-300 transition-colors"
      >
        <span className="font-mono font-medium truncate">{file.name}</span>
        <div className="flex items-center gap-3 shrink-0 ml-3">
          {added > 0 && <span className="text-green-400 text-xs">+{added}</span>}
          {removed > 0 && <span className="text-red-400 text-xs">−{removed}</span>}
          <span className="text-slate-500 text-xs">{open ? '▲' : '▼'}</span>
        </div>
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
                    ? 'bg-red-900/30 text-red-400 line-through'
                    : 'text-slate-600'
              }
            >
              <span className="select-none px-2 text-slate-700 border-r border-white/5 inline-block w-6 text-right mr-2">
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
