// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { CompactFileList } from '../CompactFileList'
import type { FileEntry } from '../types'

const FILES: FileEntry[] = [
  { id: 'a', name: 'app.ts', code: '', lines: 10 },
  { id: 'b', name: 'routes.ts', code: '', lines: 25 },
]

describe('CompactFileList', () => {
  it('renders a count header and each file with its line count', () => {
    render(<CompactFileList files={FILES} onRemove={vi.fn()} />)
    expect(screen.getByText('2 files loaded')).toBeInTheDocument()
    expect(screen.getByText('app.ts')).toBeInTheDocument()
    expect(screen.getByText('25 lines')).toBeInTheDocument()
  })

  it('fires onRemove with the file id', async () => {
    const user = userEvent.setup()
    const onRemove = vi.fn()
    render(<CompactFileList files={FILES} onRemove={onRemove} />)
    const removeButtons = screen.getAllByTitle('Remove file')
    await user.click(removeButtons[0])
    expect(onRemove).toHaveBeenCalledWith('a')
  })
})
