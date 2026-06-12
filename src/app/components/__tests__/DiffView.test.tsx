// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DiffView } from '../DiffView'
import type { MigratedFile } from '@/lib/schemas'

const FILE: MigratedFile = {
  name: 'app.ts',
  originalCode: 'const a = 1\nconst b = 2',
  migratedCode: 'const a = 1\nconst c = 3',
  stepId: 0,
}

describe('DiffView', () => {
  it('renders the file name and added/removed counts', () => {
    render(<DiffView file={FILE} />)
    expect(screen.getByText('app.ts')).toBeInTheDocument()
    expect(screen.getByText('+1')).toBeInTheDocument()
    expect(screen.getByText('−1')).toBeInTheDocument()
  })

  it('is collapsed by default and expands the diff on click', async () => {
    const user = userEvent.setup()
    render(<DiffView file={FILE} />)
    expect(screen.queryByText('const c = 3')).not.toBeInTheDocument()
    await user.click(screen.getByText('app.ts'))
    expect(screen.getByText('const c = 3')).toBeInTheDocument()
  })
})
