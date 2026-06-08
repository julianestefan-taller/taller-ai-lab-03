import { describe, it, expect } from 'vitest'
import { GET } from '../route'

describe('GET /api/health', () => {
  it('returns status ok', async () => {
    const res = await GET()
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.status).toBe('ok')
  })

  it('returns a valid ISO timestamp', async () => {
    const res = await GET()
    const data = await res.json()
    expect(() => new Date(data.timestamp)).not.toThrow()
    expect(new Date(data.timestamp).toISOString()).toBe(data.timestamp)
  })
})
