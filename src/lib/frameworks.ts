export type FrameworkCategory = 'backend' | 'frontend' | 'fullstack'
export type FrameworkLanguage = 'javascript' | 'typescript' | 'python'

export interface Framework {
  id: string
  label: string
  category: FrameworkCategory
  language: FrameworkLanguage
  description: string
}

export const FRAMEWORKS: Framework[] = [
  // Backend JS/TS
  { id: 'express', label: 'Express', category: 'backend', language: 'javascript', description: 'Minimal Node.js web framework' },
  { id: 'fastify', label: 'Fastify', category: 'backend', language: 'typescript', description: 'Fast and low overhead Node.js framework' },
  { id: 'hono', label: 'Hono', category: 'backend', language: 'typescript', description: 'Ultrafast web framework for edge runtimes' },
  { id: 'koa', label: 'Koa', category: 'backend', language: 'javascript', description: 'Next-gen Node.js web framework by Express team' },
  { id: 'nestjs', label: 'NestJS', category: 'backend', language: 'typescript', description: 'Progressive Node.js framework with decorators' },
  // Backend Python
  { id: 'flask', label: 'Flask', category: 'backend', language: 'python', description: 'Lightweight Python WSGI web framework' },
  { id: 'fastapi', label: 'FastAPI', category: 'backend', language: 'python', description: 'Modern Python web framework with async support' },
  { id: 'django', label: 'Django', category: 'backend', language: 'python', description: 'Batteries-included Python web framework' },
  // Frontend
  { id: 'react', label: 'React', category: 'frontend', language: 'typescript', description: 'UI library for building component trees' },
  { id: 'vue', label: 'Vue', category: 'frontend', language: 'typescript', description: 'Progressive JavaScript framework for UIs' },
  { id: 'svelte', label: 'Svelte', category: 'frontend', language: 'typescript', description: 'Compiler-based UI framework with no virtual DOM' },
  // Fullstack
  { id: 'nextjs', label: 'Next.js', category: 'fullstack', language: 'typescript', description: 'React framework with SSR and API routes' },
  { id: 'nuxt', label: 'Nuxt', category: 'fullstack', language: 'typescript', description: 'Vue framework with SSR and file-based routing' },
  { id: 'sveltekit', label: 'SvelteKit', category: 'fullstack', language: 'typescript', description: 'Svelte-based full-stack framework' },
]

export function getFramework(id: string): Framework | undefined {
  return FRAMEWORKS.find((f) => f.id === id)
}

export function isValidCombo(sourceId: string, targetId: string): boolean {
  if (sourceId === targetId) return false
  const source = getFramework(sourceId)
  const target = getFramework(targetId)
  if (!source || !target) return false
  // Cross-language migrations are allowed but cross-paradigm (backend→frontend) are not
  if (source.category !== target.category) {
    // Allow backend↔backend and frontend↔frontend and fullstack↔fullstack
    // Disallow e.g. express → react
    return false
  }
  return true
}
