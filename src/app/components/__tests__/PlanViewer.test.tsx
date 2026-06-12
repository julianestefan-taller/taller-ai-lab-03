// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { PlanViewer } from '../PlanViewer'
import type { MigrationPlan } from '@/lib/schemas'

const PLAN: MigrationPlan = {
  steps: [
    { id: 0, title: 'Convert app entry', description: 'Rewrite the bootstrap.', dependsOn: [], complexity: 'high', targetFiles: ['app.ts'], status: 'pending' },
    { id: 1, title: 'Port routes', description: 'Map routes.', dependsOn: [0], complexity: 'medium', targetFiles: ['routes.ts'], status: 'pending' },
  ],
  notes: ['Watch for middleware order'],
}

describe('PlanViewer', () => {
  it('renders each step with title, description, and complexity', () => {
    render(<PlanViewer plan={PLAN} onApprove={vi.fn()} onReject={vi.fn()} />)
    expect(screen.getByText('Convert app entry')).toBeInTheDocument()
    expect(screen.getByText('Rewrite the bootstrap.')).toBeInTheDocument()
    expect(screen.getByText('high')).toBeInTheDocument()
    expect(screen.getByText('medium')).toBeInTheDocument()
  })

  it('shows dependsOn and notes', () => {
    render(<PlanViewer plan={PLAN} onApprove={vi.fn()} onReject={vi.fn()} />)
    expect(screen.getByText('depends on: #0')).toBeInTheDocument()
    expect(screen.getByText(/Watch for middleware order/)).toBeInTheDocument()
  })

  it('passes the plan to onApprove and fires onReject', async () => {
    const user = userEvent.setup()
    const onApprove = vi.fn()
    const onReject = vi.fn()
    render(<PlanViewer plan={PLAN} onApprove={onApprove} onReject={onReject} />)
    await user.click(screen.getByRole('button', { name: 'Approve & Execute' }))
    expect(onApprove).toHaveBeenCalledWith(PLAN)
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onReject).toHaveBeenCalled()
  })
})
