<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white border-b px-6 py-4">
      <h1 class="text-xl font-semibold text-gray-900">Product Catalog</h1>
    </header>

    <main class="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <!-- Search + filter bar -->
      <div class="flex gap-3 flex-wrap">
        <input
          v-model="search"
          type="text"
          placeholder="Search products…"
          class="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
        />
        <select
          v-model="categoryFilter"
          class="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
        >
          <option value="">All categories</option>
          <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
        </select>
        <select
          v-model="sortBy"
          class="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="name">Sort: Name</option>
          <option value="price-asc">Sort: Price ↑</option>
          <option value="price-desc">Sort: Price ↓</option>
        </select>
      </div>

      <!-- Loading / error states -->
      <p v-if="loading" class="text-center text-gray-400 py-12">Loading…</p>
      <div
        v-else-if="error"
        class="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700"
      >
        {{ error }}
      </div>

      <!-- Product grid -->
      <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="product in sortedProducts"
          :key="product.id"
          class="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div class="flex items-start justify-between mb-2">
            <h2 class="font-semibold text-gray-900">{{ product.name }}</h2>
            <span class="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5">
              {{ product.category }}
            </span>
          </div>
          <p class="text-sm text-gray-500 mb-3">{{ product.description }}</p>
          <div class="flex items-center justify-between">
            <span class="text-lg font-bold text-gray-900">${{ product.price.toFixed(2) }}</span>
            <button
              :disabled="product.stock === 0 || cartCount(product.id) >= product.stock"
              @click="addToCart(product)"
              class="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-medium transition-colors"
            >
              {{ product.stock === 0 ? 'Out of stock' : 'Add to cart' }}
            </button>
          </div>
          <p v-if="product.stock < 10 && product.stock > 0" class="text-xs text-orange-500 mt-1">
            Only {{ product.stock }} left!
          </p>
        </div>

        <p
          v-if="sortedProducts.length === 0"
          class="col-span-full text-center text-gray-400 py-12"
        >
          No products match your search.
        </p>
      </div>

      <!-- Cart summary -->
      <div v-if="cart.length > 0" class="fixed bottom-4 right-4 bg-white border rounded-xl shadow-lg p-4 w-72">
        <h3 class="font-semibold mb-2">Cart ({{ totalItems }} items)</h3>
        <div class="space-y-1 max-h-40 overflow-y-auto mb-3">
          <div v-for="item in cart" :key="item.product.id" class="flex justify-between text-sm">
            <span class="truncate">{{ item.product.name }} ×{{ item.qty }}</span>
            <span class="shrink-0 ml-2">${{ (item.product.price * item.qty).toFixed(2) }}</span>
          </div>
        </div>
        <div class="flex justify-between font-semibold border-t pt-2">
          <span>Total</span>
          <span>${{ cartTotal.toFixed(2) }}</span>
        </div>
        <button
          @click="clearCart"
          class="mt-2 w-full text-xs text-gray-400 hover:text-red-400 transition-colors"
        >
          Clear cart
        </button>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface Product {
  id: number
  name: string
  description: string
  price: number
  stock: number
  category: string
}

interface CartItem {
  product: Product
  qty: number
}

// ---- State ------------------------------------------------------------------

const products = ref<Product[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const search = ref('')
const categoryFilter = ref('')
const sortBy = ref<'name' | 'price-asc' | 'price-desc'>('name')
const cart = ref<CartItem[]>([])

// ---- Lifecycle --------------------------------------------------------------

onMounted(async () => {
  try {
    const res = await fetch('/api/products')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    products.value = data.products
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load products'
  } finally {
    loading.value = false
  }
})

// ---- Computed ---------------------------------------------------------------

const categories = computed(() => [...new Set(products.value.map((p) => p.category))].sort())

const filteredProducts = computed(() => {
  return products.value.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.value.toLowerCase()) ||
      p.description.toLowerCase().includes(search.value.toLowerCase())
    const matchesCategory = !categoryFilter.value || p.category === categoryFilter.value
    return matchesSearch && matchesCategory
  })
})

const sortedProducts = computed(() => {
  const list = [...filteredProducts.value]
  if (sortBy.value === 'price-asc') return list.sort((a, b) => a.price - b.price)
  if (sortBy.value === 'price-desc') return list.sort((a, b) => b.price - a.price)
  return list.sort((a, b) => a.name.localeCompare(b.name))
})

const totalItems = computed(() => cart.value.reduce((n, i) => n + i.qty, 0))
const cartTotal = computed(() => cart.value.reduce((n, i) => n + i.product.price * i.qty, 0))

// ---- Methods ----------------------------------------------------------------

function cartCount(productId: number): number {
  return cart.value.find((i) => i.product.id === productId)?.qty ?? 0
}

function addToCart(product: Product) {
  const existing = cart.value.find((i) => i.product.id === product.id)
  if (existing) {
    existing.qty++
  } else {
    cart.value.push({ product, qty: 1 })
  }
}

function clearCart() {
  cart.value = []
}
</script>
