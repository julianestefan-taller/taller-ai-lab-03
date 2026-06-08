import { useState, useEffect, useCallback } from 'react'

// ---- Types ------------------------------------------------------------------

interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'user'
  avatar?: string
}

interface Notification {
  id: number
  message: string
  read: boolean
  createdAt: string
}

// ---- Custom hooks -----------------------------------------------------------

function useUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setUsers(data.users)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  async function deleteUser(id: number) {
    await fetch(`/api/users/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
    setUsers((prev) => prev.filter((u) => u.id !== id))
  }

  return { users, loading, error, refetch: fetchUsers, deleteUser }
}

// ---- Sub-components ---------------------------------------------------------

function UserCard({ user, onDelete }: { user: User; onDelete: (id: number) => void }) {
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="border rounded-lg p-4 flex items-center gap-4 shadow-sm">
      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-semibold text-indigo-600">
        {user.name[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{user.name}</p>
        <p className="text-sm text-gray-500 truncate">{user.email}</p>
      </div>
      <span className={`text-xs rounded-full px-2 py-0.5 ${
        user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
      }`}>
        {user.role}
      </span>
      {confirming ? (
        <div className="flex gap-2">
          <button
            onClick={() => onDelete(user.id)}
            className="text-xs text-red-600 font-medium"
          >
            Confirm
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="text-xs text-gray-500"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="text-gray-400 hover:text-red-500 transition-colors"
          aria-label="Delete user"
        >
          ✕
        </button>
      )}
    </div>
  )
}

function NotificationBell({ count }: { count: number }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 text-gray-600 hover:text-gray-900"
        aria-label="Notifications"
      >
        🔔
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white border rounded-lg shadow-lg z-10 p-3">
          <p className="text-sm font-medium text-gray-700 mb-2">Notifications</p>
          {count === 0 ? (
            <p className="text-sm text-gray-400">All caught up!</p>
          ) : (
            <p className="text-sm text-gray-600">{count} unread notifications</p>
          )}
        </div>
      )}
    </div>
  )
}

// ---- Main component ---------------------------------------------------------

export default function UserDashboard() {
  const { users, loading, error, refetch, deleteUser } = useUsers()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all')
  const notifications: Notification[] = [] // would be fetched in real app

  const filtered = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter === 'all' || u.role === roleFilter
    return matchesSearch && matchesRole
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">User Dashboard</h1>
        <div className="flex items-center gap-3">
          <NotificationBell count={notifications.filter((n) => !n.read).length} />
          <button
            onClick={refetch}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Refresh
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto py-8 px-4 space-y-4">
        {/* Filters */}
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Search users…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="all">All roles</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </select>
        </div>

        {/* States */}
        {loading && <p className="text-center text-gray-400 py-8">Loading users…</p>}

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <p className="text-sm text-gray-500">
              Showing {filtered.length} of {users.length} users
            </p>
            <div className="space-y-3">
              {filtered.map((user) => (
                <UserCard key={user.id} user={user} onDelete={deleteUser} />
              ))}
              {filtered.length === 0 && (
                <p className="text-center text-gray-400 py-8">No users match your filters.</p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
