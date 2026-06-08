import { describe, it, expect } from 'vitest'
import { buildLevels } from '../graph'
import type { MigrationStep } from '../../schemas'

function makeStep(id: number, dependsOn: number[]): MigrationStep {
  return {
    id,
    title: `Step ${id}`,
    description: '',
    dependsOn,
    complexity: 'low',
    targetFiles: [],
    status: 'pending',
  }
}

describe('buildLevels', () => {
  it('returns single level when all steps are independent', () => {
    const steps = [makeStep(0, []), makeStep(1, []), makeStep(2, [])]
    const levels = buildLevels(steps)
    expect(levels).toHaveLength(1)
    expect(levels[0]).toHaveLength(3)
  })

  it('returns two levels for a simple dependency chain', () => {
    const steps = [makeStep(0, []), makeStep(1, [0])]
    const levels = buildLevels(steps)
    expect(levels).toHaveLength(2)
    expect(levels[0].map((s) => s.id)).toContain(0)
    expect(levels[1].map((s) => s.id)).toContain(1)
  })

  it('groups parallel steps correctly', () => {
    // 0 → 1, 0 → 2, then 3 depends on both 1 and 2
    const steps = [
      makeStep(0, []),
      makeStep(1, [0]),
      makeStep(2, [0]),
      makeStep(3, [1, 2]),
    ]
    const levels = buildLevels(steps)
    expect(levels).toHaveLength(3)
    expect(levels[0].map((s) => s.id)).toEqual([0])
    expect(levels[1].map((s) => s.id).sort()).toEqual([1, 2])
    expect(levels[2].map((s) => s.id)).toEqual([3])
  })

  it('throws on cycle', () => {
    const steps = [makeStep(0, [1]), makeStep(1, [0])]
    expect(() => buildLevels(steps)).toThrow('Cycle')
  })

  it('throws on unknown dependency id', () => {
    const steps = [makeStep(0, [99])]
    expect(() => buildLevels(steps)).toThrow('unknown step 99')
  })

  it('handles a single step with no deps', () => {
    const levels = buildLevels([makeStep(0, [])])
    expect(levels).toHaveLength(1)
    expect(levels[0][0].id).toBe(0)
  })
})
