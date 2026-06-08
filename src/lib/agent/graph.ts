import type { MigrationStep } from '../schemas'

/**
 * Builds topological levels from a set of steps using Kahn's algorithm.
 * Steps in the same level have no inter-dependencies and can run in parallel.
 * Throws if a cycle is detected or a dependency ID is missing.
 */
export function buildLevels(steps: MigrationStep[]): MigrationStep[][] {
  const ids = new Set(steps.map((s) => s.id))

  // Validate that all dependsOn IDs exist
  for (const step of steps) {
    for (const dep of step.dependsOn) {
      if (!ids.has(dep)) {
        throw new Error(`Step ${step.id} depends on unknown step ${dep}`)
      }
    }
  }

  // in-degree count
  const inDegree = new Map<number, number>()
  // adjacency: dep → dependents
  const dependents = new Map<number, number[]>()

  for (const step of steps) {
    if (!inDegree.has(step.id)) inDegree.set(step.id, 0)
    if (!dependents.has(step.id)) dependents.set(step.id, [])
    for (const dep of step.dependsOn) {
      inDegree.set(step.id, (inDegree.get(step.id) ?? 0) + 1)
      if (!dependents.has(dep)) dependents.set(dep, [])
      dependents.get(dep)!.push(step.id)
    }
  }

  // Kahn's BFS
  const stepById = new Map(steps.map((s) => [s.id, s]))
  const levels: MigrationStep[][] = []
  let queue = steps.filter((s) => (inDegree.get(s.id) ?? 0) === 0)

  while (queue.length > 0) {
    levels.push(queue)
    const next: MigrationStep[] = []
    for (const step of queue) {
      for (const depId of dependents.get(step.id) ?? []) {
        const deg = (inDegree.get(depId) ?? 0) - 1
        inDegree.set(depId, deg)
        if (deg === 0) next.push(stepById.get(depId)!)
      }
    }
    queue = next
  }

  const processed = levels.flat().length
  if (processed < steps.length) {
    throw new Error('Cycle detected in migration plan dependencies')
  }

  return levels
}
