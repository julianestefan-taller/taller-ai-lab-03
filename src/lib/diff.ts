export type DiffLine =
  | { type: 'unchanged'; content: string }
  | { type: 'added'; content: string }
  | { type: 'removed'; content: string }

export function lineDiff(original: string, migrated: string): DiffLine[] {
  const aLines = original === '' ? [] : original.split('\n')
  const bLines = migrated === '' ? [] : migrated.split('\n')

  // LCS-based diff using Myers-style DP (simple O(n*m) for lab scale)
  const n = aLines.length
  const m = bLines.length

  // Build LCS table
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (aLines[i] === bLines[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1])
      }
    }
  }

  const result: DiffLine[] = []
  let i = 0
  let j = 0
  while (i < n || j < m) {
    if (i < n && j < m && aLines[i] === bLines[j]) {
      result.push({ type: 'unchanged', content: aLines[i] })
      i++
      j++
    } else if (j < m && (i >= n || dp[i][j + 1] >= dp[i + 1][j])) {
      result.push({ type: 'added', content: bLines[j] })
      j++
    } else {
      result.push({ type: 'removed', content: aLines[i] })
      i++
    }
  }
  return result
}
