import express from 'express'
import { router as usersRouter } from './routes/users'
import { router as productsRouter } from './routes/products'
import { authMiddleware } from './middleware/auth'
import { errorHandler } from './middleware/error'

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Request logging
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.path}`)
  next()
})

// Health check (no auth)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Protected routes
app.use('/api/users', authMiddleware, usersRouter)
app.use('/api/products', authMiddleware, productsRouter)

// Global error handler must come last
app.use(errorHandler)

const PORT = process.env.PORT ?? 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

export default app
