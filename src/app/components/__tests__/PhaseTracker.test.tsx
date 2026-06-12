// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { PhaseTracker } from '../PhaseTracker'
import type { Phase, PhaseState } from '../types'

function phases(overrides: Partial<Record<Phase, PhaseState>> = {}): Record<Phase, PhaseState> {
  return {
    analysis: { status: 'idle' },
    planning: { status: 'idle' },
    execution: { status: 'idle' },
    verification: { status: 'idle' },
    ...overrides,
  }
}

describe('PhaseTracker', () => {
  it('renders all four phase labels', () => {
    render(<PhaseTracker phases={phases()} current="analysis" />)
    expect(screen.getByText('Analysis')).toBeInTheDocument()
    expect(screen.getByText('Planning')).toBeInTheDocument()
    expect(screen.getByText('Execution')).toBeInTheDocument()
    expect(screen.getByText('Verification')).toBeInTheDocument()
  })

  it('marks a done phase green and a running phase yellow', () => {
    render(
      <PhaseTracker
        phases={phases({ analysis: { status: 'done' }, planning: { status: 'running' } })}
        current="planning"
      />
    )
    expect(screen.getByText('Analysis')).toHaveClass('text-green-400')
    expect(screen.getByText('Planning')).toHaveClass('text-yellow-400')
  })

  it('highlights the current idle phase', () => {
    render(<PhaseTracker phases={phases()} current="execution" />)
    expect(screen.getByText('Execution')).toHaveClass('text-indigo-400')
  })
})
