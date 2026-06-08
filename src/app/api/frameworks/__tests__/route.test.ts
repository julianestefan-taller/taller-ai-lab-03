import { describe, it, expect } from 'vitest'
import { GET } from '../route'

describe('GET /api/frameworks', () => {
  it('returns an array of frameworks', async () => {
    const res = await GET()
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(Array.isArray(data.frameworks)).toBe(true)
    expect(data.frameworks.length).toBeGreaterThan(0)
  })

  it('each framework has id, label, category, language', async () => {
    const res = await GET()
    const data = await res.json()
    for (const fw of data.frameworks) {
      expect(fw.id).toBeTruthy()
      expect(fw.label).toBeTruthy()
      expect(fw.category).toBeTruthy()
      expect(fw.language).toBeTruthy()
    }
  })
})
