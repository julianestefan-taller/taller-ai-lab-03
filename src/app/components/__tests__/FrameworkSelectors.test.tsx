// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { FrameworkSelectors } from '../FrameworkSelectors'
import type { Framework } from '@/lib/frameworks'

const FRAMEWORKS: Framework[] = [
  { id: 'express', label: 'Express', category: 'backend', language: 'javascript', description: '' },
  { id: 'fastify', label: 'Fastify', category: 'backend', language: 'typescript', description: '' },
  { id: 'hono', label: 'Hono', category: 'backend', language: 'typescript', description: '' },
]

describe('FrameworkSelectors', () => {
  it('renders source and target labels', () => {
    render(
      <FrameworkSelectors
        frameworks={FRAMEWORKS}
        sourceId="express"
        targetId="fastify"
        onSourceChange={vi.fn()}
        onTargetChange={vi.fn()}
      />
    )
    expect(screen.getByText('Source Framework')).toBeInTheDocument()
    expect(screen.getByText('Target Framework')).toBeInTheDocument()
  })

  it('excludes the selected source from the target options', () => {
    render(
      <FrameworkSelectors
        frameworks={FRAMEWORKS}
        sourceId="express"
        targetId="fastify"
        onSourceChange={vi.fn()}
        onTargetChange={vi.fn()}
      />
    )
    // "Express (javascript)" appears only in the source select, not the target
    expect(screen.getAllByRole('option', { name: 'Express (javascript)' })).toHaveLength(1)
  })

  it('fires onSourceChange when the source changes', async () => {
    const user = userEvent.setup()
    const onSourceChange = vi.fn()
    render(
      <FrameworkSelectors
        frameworks={FRAMEWORKS}
        sourceId="express"
        targetId="fastify"
        onSourceChange={onSourceChange}
        onTargetChange={vi.fn()}
      />
    )
    const [sourceSelect] = screen.getAllByRole('combobox')
    await user.selectOptions(sourceSelect, 'hono')
    expect(onSourceChange).toHaveBeenCalledWith('hono')
  })
})
