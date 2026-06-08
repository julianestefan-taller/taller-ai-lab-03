import { describe, it, expect } from 'vitest'
import { FRAMEWORKS, getFramework, isValidCombo } from '../frameworks'

describe('frameworks', () => {
  it('has at least 10 frameworks', () => {
    expect(FRAMEWORKS.length).toBeGreaterThanOrEqual(10)
  })

  it('getFramework returns undefined for unknown id', () => {
    expect(getFramework('unknown-fw')).toBeUndefined()
  })

  it('getFramework returns the correct framework', () => {
    const fw = getFramework('express')
    expect(fw).toBeDefined()
    expect(fw!.label).toBe('Express')
    expect(fw!.category).toBe('backend')
  })

  it('all frameworks have required fields', () => {
    for (const fw of FRAMEWORKS) {
      expect(fw.id).toBeTruthy()
      expect(fw.label).toBeTruthy()
      expect(['backend', 'frontend', 'fullstack']).toContain(fw.category)
      expect(['javascript', 'typescript', 'python']).toContain(fw.language)
    }
  })

  it('isValidCombo rejects same source and target', () => {
    expect(isValidCombo('express', 'express')).toBe(false)
  })

  it('isValidCombo rejects unknown frameworks', () => {
    expect(isValidCombo('unknown', 'express')).toBe(false)
    expect(isValidCombo('express', 'unknown')).toBe(false)
  })

  it('isValidCombo rejects cross-category combos', () => {
    // backend → frontend
    expect(isValidCombo('express', 'react')).toBe(false)
  })

  it('isValidCombo accepts same-category combos', () => {
    expect(isValidCombo('express', 'fastify')).toBe(true)
    expect(isValidCombo('flask', 'fastapi')).toBe(true)
    expect(isValidCombo('react', 'vue')).toBe(true)
  })
})
