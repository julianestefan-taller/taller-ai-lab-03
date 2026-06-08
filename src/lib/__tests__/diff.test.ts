import { describe, it, expect } from 'vitest'
import { lineDiff } from '../diff'

describe('lineDiff', () => {
  it('returns empty for two empty strings', () => {
    expect(lineDiff('', '')).toEqual([])
  })

  it('marks all lines as added when original is empty', () => {
    const result = lineDiff('', 'a\nb')
    expect(result).toEqual([
      { type: 'added', content: 'a' },
      { type: 'added', content: 'b' },
    ])
  })

  it('marks all lines as removed when migrated is empty', () => {
    const result = lineDiff('a\nb', '')
    expect(result).toEqual([
      { type: 'removed', content: 'a' },
      { type: 'removed', content: 'b' },
    ])
  })

  it('marks identical content as unchanged', () => {
    const result = lineDiff('a\nb\nc', 'a\nb\nc')
    expect(result.every((l) => l.type === 'unchanged')).toBe(true)
  })

  it('detects a single added line', () => {
    const result = lineDiff('a\nb', 'a\nx\nb')
    const added = result.filter((l) => l.type === 'added')
    expect(added.length).toBe(1)
    expect(added[0].content).toBe('x')
  })

  it('detects a single removed line', () => {
    const result = lineDiff('a\nx\nb', 'a\nb')
    const removed = result.filter((l) => l.type === 'removed')
    expect(removed.length).toBe(1)
    expect(removed[0].content).toBe('x')
  })

  it('handles a single-line change', () => {
    const result = lineDiff('hello', 'world')
    expect(result).toContainEqual({ type: 'removed', content: 'hello' })
    expect(result).toContainEqual({ type: 'added', content: 'world' })
  })
})
