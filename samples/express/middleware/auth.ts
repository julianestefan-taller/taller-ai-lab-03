import type { Request, Response, NextFunction } from 'express'

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: string }
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    return res.status(401).json({ error: 'Missing authorization header' })
  }
  // In production, verify a JWT here
  if (token === 'invalid') {
    return res.status(401).json({ error: 'Invalid token' })
  }
  req.user = { id: '1', role: 'user' }
  next()
}
