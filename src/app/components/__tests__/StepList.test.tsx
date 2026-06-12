// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { StepList } from '../StepList'
import type { StepState } from '../types'

const STEPS: StepState[] = [
  { id: 0, title: 'Convert routes', status: 'completed' },
  { id: 1, title: 'Migrate middleware', status: 'in_progress' },
]

describe('StepList', () => {
  it('renders nothing when there are no steps', () => {
    const { container } = render(<StepList steps={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders a row per step with its title', () => {
    render(<StepList steps={STEPS} />)
    expect(screen.getByText('Convert routes')).toBeInTheDocument()
    expect(screen.getByText('Migrate middleware')).toBeInTheDocument()
  })

  it('shows a humanized status label', () => {
    render(<StepList steps={STEPS} />)
    expect(screen.getByText('completed')).toBeInTheDocument()
    expect(screen.getByText('in progress')).toBeInTheDocument()
  })
})
