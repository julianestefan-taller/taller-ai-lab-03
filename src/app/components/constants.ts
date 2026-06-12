import type { StepStatus } from '@/lib/schemas'
import type { Phase } from './types'

export const PHASE_LABELS: Record<Phase, string> = {
  analysis: 'Analysis',
  planning: 'Planning',
  execution: 'Execution',
  verification: 'Verification',
}

export const PHASES: Phase[] = ['analysis', 'planning', 'execution', 'verification']

export const STATUS_COLORS: Record<StepStatus, string> = {
  pending: 'text-slate-500',
  in_progress: 'text-yellow-400',
  completed: 'text-green-400',
  failed: 'text-red-400',
  skipped: 'text-slate-600',
}

export const STATUS_DOT: Record<StepStatus, string> = {
  pending: 'bg-slate-600',
  in_progress: 'bg-yellow-400 animate-pulse',
  completed: 'bg-green-400',
  failed: 'bg-red-400',
  skipped: 'bg-slate-700',
}
