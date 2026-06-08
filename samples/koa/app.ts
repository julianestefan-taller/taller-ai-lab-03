import Koa from 'koa'
import Router from '@koa/router'
import bodyParser from 'koa-bodyparser'

const app = new Koa()
const router = new Router()

// Types
interface Product {
  id: number
  name: string
  price: number
  stock: number
}

const products: Product[] = [
  { id: 1, name: 'Widget', price: 9.99, stock: 100 },
  { id: 2, name: 'Gadget', price: 24.99, stock: 50 },
]

// Error handling middleware
app.use(async (ctx, next) => {
  try {
    await next()
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string }
    ctx.status = e.status ?? 500
    ctx.body = { error: e.message ?? 'Internal server error' }
  }
})

// Logger middleware
app.use(async (ctx, next) => {
  const start = Date.now()
  await next()
  console.log(`${ctx.method} ${ctx.path} - ${Date.now() - start}ms`)
})

// Auth middleware (applied per-route via router.use)
async function auth(ctx: Koa.Context, next: Koa.Next) {
  const token = ctx.headers.authorization?.replace('Bearer ', '')
  if (!token) ctx.throw(401, 'Missing authorization header')
  ctx.state.user = { id: '1' }
  await next()
}

// Routes
router.get('/health', (ctx) => {
  ctx.body = { status: 'ok' }
})

router.get('/api/products', auth, (ctx) => {
  const { minPrice } = ctx.query
  const filtered = minPrice
    ? products.filter((p) => p.price >= parseFloat(minPrice as string))
    : products
  ctx.body = { products: filtered }
})

router.get('/api/products/:id', auth, (ctx) => {
  const product = products.find((p) => p.id === parseInt(ctx.params.id))
  if (!product) ctx.throw(404, 'Product not found')
  ctx.body = product
})

router.post('/api/products', auth, async (ctx) => {
  const body = ctx.request.body as Partial<Product>
  if (!body.name || body.price == null) ctx.throw(400, 'name and price are required')
  const newProduct: Product = {
    id: products.length + 1,
    name: body.name,
    price: body.price,
    stock: body.stock ?? 0,
  }
  products.push(newProduct)
  ctx.status = 201
  ctx.body = newProduct
})

router.delete('/api/products/:id', auth, (ctx) => {
  const idx = products.findIndex((p) => p.id === parseInt(ctx.params.id))
  if (idx === -1) ctx.throw(404, 'Product not found')
  products.splice(idx, 1)
  ctx.status = 204
})

app.use(bodyParser())
app.use(router.routes())
app.use(router.allowedMethods())

const PORT = process.env.PORT ?? 3000
app.listen(PORT, () => console.log(`Koa server on port ${PORT}`))

export default app
