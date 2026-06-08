import { Router, type Request, type Response, type NextFunction } from 'express'

export const router = Router()

interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'user'
}

// In-memory store for demo purposes
const users: User[] = [
  { id: 1, name: 'Alice', email: 'alice@example.com', role: 'admin' },
  { id: 2, name: 'Bob', email: 'bob@example.com', role: 'user' },
]

router.get('/', (_req: Request, res: Response) => {
  res.json({ users, total: users.length })
})

router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  const user = users.find((u) => u.id === parseInt(req.params.id))
  if (!user) {
    return next({ status: 404, message: 'User not found' })
  }
  res.json(user)
})

router.post('/', (req: Request, res: Response, next: NextFunction) => {
  const { name, email, role } = req.body as Partial<User>
  if (!name || !email) {
    return next({ status: 400, message: 'name and email are required' })
  }
  const newUser: User = {
    id: users.length + 1,
    name,
    email,
    role: role ?? 'user',
  }
  users.push(newUser)
  res.status(201).json(newUser)
})

router.put('/:id', (req: Request, res: Response, next: NextFunction) => {
  const idx = users.findIndex((u) => u.id === parseInt(req.params.id))
  if (idx === -1) return next({ status: 404, message: 'User not found' })
  users[idx] = { ...users[idx], ...req.body }
  res.json(users[idx])
})

router.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
  const idx = users.findIndex((u) => u.id === parseInt(req.params.id))
  if (idx === -1) return next({ status: 404, message: 'User not found' })
  users.splice(idx, 1)
  res.status(204).send()
})
