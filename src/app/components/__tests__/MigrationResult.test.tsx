// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { MigrationResult } from '../MigrationResult'
import type { MigrationResult as MigrationResultData } from '@/lib/schemas'

const RESULT: MigrationResultData = {
  success: true,
  migratedFiles: [
    { name: 'app.ts', originalCode: 'a', migratedCode: 'b', stepId: 0 },
  ],
  plan: {
    steps: [{ id: 0, title: 'Convert', description: 'd', dependsOn: [], complexity: 'low', targetFiles: ['app.ts'], status: 'completed' }],
    notes: [],
  },
  verification: {
    passed: true,
    checks: [{ name: 'Compiles', passed: true, detail: 'no errors' }],
    remainingIssues: ['Manual review of auth needed'],
    report: 'Migration completed successfully.',
  },
  errors: [],
  rolledBack: false,
}

describe('MigrationResult', () => {
  it('shows a success badge and the verification report', () => {
    render(<MigrationResult result={RESULT} targetId="fastify" onReset={vi.fn()} />)
    expect(screen.getByText('success')).toBeInTheDocument()
    expect(screen.getByText('Migration completed successfully.')).toBeInTheDocument()
  })

  it('shows a failed badge and rollback note when applicable', () => {
    render(
      <MigrationResult
        result={{ ...RESULT, success: false, rolledBack: true }}
        targetId="fastify"
        onReset={vi.fn()}
      />
    )
    expect(screen.getByText('failed')).toBeInTheDocument()
    expect(screen.getByText(/rolled back/i)).toBeInTheDocument()
  })

  it('renders verification checks and remaining issues', () => {
    render(<MigrationResult result={RESULT} targetId="fastify" onReset={vi.fn()} />)
    expect(screen.getByText('Verification Checks')).toBeInTheDocument()
    expect(screen.getByText('Compiles')).toBeInTheDocument()
    expect(screen.getByText('Remaining Issues')).toBeInTheDocument()
    expect(screen.getByText('Manual review of auth needed')).toBeInTheDocument()
  })

  it('shows the download button when there are migrated files', () => {
    render(<MigrationResult result={RESULT} targetId="fastify" onReset={vi.fn()} />)
    expect(screen.getByRole('button', { name: /download \.zip/i })).toBeInTheDocument()
  })

  it('fires onReset when "Start new migration" is clicked', async () => {
    const user = userEvent.setup()
    const onReset = vi.fn()
    render(<MigrationResult result={RESULT} targetId="fastify" onReset={onReset} />)
    await user.click(screen.getByRole('button', { name: 'Start new migration' }))
    expect(onReset).toHaveBeenCalled()
  })
})
