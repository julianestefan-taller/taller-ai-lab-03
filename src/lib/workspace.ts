import { zipSync } from 'fflate'
import type { MigratedFile } from './schemas'

// ---- Filter config ----------------------------------------------------------

const SKIP_DIRS = new Set([
  'node_modules', '.git', '.next', 'dist', 'build', 'out',
  'coverage', '.venv', 'venv', '__pycache__', '.pytest_cache',
  'target', '.turbo', '.cache', '.svelte-kit', '.nuxt', '.output',
  '.yarn', 'vendor',
])

const CODE_EXTS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.go', '.rs', '.java', '.cs', '.php',
  '.rb', '.swift', '.kt', '.vue', '.svelte',
  '.html', '.css', '.scss', '.sass',
  '.json', '.toml', '.yaml', '.yml',
  '.sh', '.bash', '.zsh',
  '.md', '.mdx', '.env.example',
])

const SKIP_FILENAMES = new Set([
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb',
  '.DS_Store', 'Thumbs.db', '.gitignore', '.gitattributes',
  'next-env.d.ts',
])

const MAX_FILE_BYTES = 50_000

// ---- Types ------------------------------------------------------------------

export interface ScannedFile {
  name: string
  code: string
  lines: number
}

export interface ScanResult {
  files: ScannedFile[]
  skipped: { dirs: number; type: number; size: number; empty: number }
}

// ---- Workspace scanner ------------------------------------------------------

export async function scanWorkspace(fileList: FileList): Promise<ScanResult> {
  const skipped = { dirs: 0, type: 0, size: 0, empty: 0 }
  const results: ScannedFile[] = []
  const enc = new TextDecoder()

  const items = Array.from(fileList) as (File & { webkitRelativePath: string })[]

  await Promise.all(
    items.map(async (file) => {
      const relativePath = file.webkitRelativePath || file.name
      const parts = relativePath.split('/')

      // Strip the root folder name that browsers prepend
      const displayPath = parts.length > 1 ? parts.slice(1).join('/') : parts[0]
      const filename = parts[parts.length - 1]

      // Skip if inside a known ignorable directory
      const pathSegments = parts.slice(0, -1)
      if (pathSegments.some((s) => SKIP_DIRS.has(s))) {
        skipped.dirs++
        return
      }

      // Skip known non-code filenames
      if (SKIP_FILENAMES.has(filename)) {
        skipped.type++
        return
      }

      // Skip by extension
      const dotIdx = filename.lastIndexOf('.')
      const ext = dotIdx >= 0 ? filename.slice(dotIdx).toLowerCase() : ''
      if (!CODE_EXTS.has(ext)) {
        skipped.type++
        return
      }

      // Skip oversized files
      if (file.size > MAX_FILE_BYTES) {
        skipped.size++
        return
      }

      const buf = await file.arrayBuffer()
      const code = enc.decode(buf)

      if (!code.trim()) {
        skipped.empty++
        return
      }

      results.push({
        name: displayPath,
        code,
        lines: code.split('\n').length,
      })
    })
  )

  // Stable order: alphabetical by path
  results.sort((a, b) => a.name.localeCompare(b.name))

  return { files: results, skipped }
}

export function skippedSummary(skipped: ScanResult['skipped']): string {
  const total = skipped.dirs + skipped.type + skipped.size + skipped.empty
  if (total === 0) return ''
  const parts: string[] = []
  if (skipped.dirs) parts.push(`${skipped.dirs} in ignored dirs`)
  if (skipped.type) parts.push(`${skipped.type} non-code`)
  if (skipped.size) parts.push(`${skipped.size} too large (>50 KB)`)
  if (skipped.empty) parts.push(`${skipped.empty} empty`)
  return `${total} files skipped (${parts.join(', ')})`
}

// ---- ZIP download -----------------------------------------------------------

export function downloadMigratedZip(migratedFiles: MigratedFile[], zipName = 'migrated.zip') {
  const enc = new TextEncoder()
  const zippable: Record<string, Uint8Array> = {}

  for (const f of migratedFiles) {
    // Preserve directory structure from the file name
    zippable[f.name] = enc.encode(f.migratedCode)
  }

  const zipped = zipSync(zippable, { level: 6 })
  const blob = new Blob([zipped], { type: 'application/zip' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = zipName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
