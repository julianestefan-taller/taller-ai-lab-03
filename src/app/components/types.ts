import type { AnalysisResult, MigrationPlan, MigrationResult, StepStatus } from '@/lib/schemas'

export interface FileEntry {
  id: string
  name: string
  code: string
  lines: number
}

export type Phase = 'analysis' | 'planning' | 'execution' | 'verification'
export type PhaseStatus = 'idle' | 'running' | 'done' | 'error'

export interface PhaseState {
  status: PhaseStatus
}

export interface StepState {
  id: number
  title: string
  status: StepStatus
}

export type AppState =
  | { kind: 'idle' }
  | { kind: 'running'; phases: Record<Phase, PhaseState>; steps: StepState[]; currentPhase: Phase }
  | { kind: 'awaiting_approval'; analysis: AnalysisResult; plan: MigrationPlan }
  | { kind: 'done'; result: MigrationResult }
  | { kind: 'error'; message: string }
