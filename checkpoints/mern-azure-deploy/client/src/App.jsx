import { useEffect, useState } from 'react'
import { getUsers, addUser, editUser, deleteUser, getHealth } from './api'
import UserForm from './UserForm'

export default function App() {
  const [users, setUsers] = useState([])
  const [editingId, setEditingId] = useState(null) // the user being edited, if any
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [health, setHealth] = useState(null)

  // Load the users (and the database status) once, when the page opens
  useEffect(() => {
    getUsers()
      .then(setUsers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
    getHealth().then(setHealth).catch(() => setHealth({ database: 'unreachable' }))
  }, [])

  // Each action calls the API, then updates the list with what the server sent back
  async function handleAdd(user) {
    const created = await addUser(user) // errors are shown by the form itself
    setUsers((list) => [...list, created])
  }

  async function handleEdit(id, changes) {
    const updated = await editUser(id, changes)
    setUsers((list) => list.map((u) => (u._id === id ? updated : u)))
    setEditingId(null)
  }

  async function handleDelete(user) {
    if (!confirm(`Delete ${user.name}?`)) return
    try {
      await deleteUser(user._id)
      setUsers((list) => list.filter((u) => u._id !== user._id))
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <main>
      <header>
        <h1>Users</h1>
        {health && (
          <span className={`status ${health.database === 'connected' ? 'ok' : 'bad'}`}>
            database: {health.database}
          </span>
        )}
      </header>

      <section className="card">
        <h2>Add a user</h2>
        <UserForm submitLabel="Add user" onSubmit={handleAdd} resetAfterSubmit />
      </section>

      <section className="card">
        <h2>All users ({users.length})</h2>
        {error && <p className="error">{error}</p>}
        {loading ? (
          <p className="muted">Loading…</p>
        ) : users.length === 0 ? (
          <p className="muted">No users yet. Add the first one above.</p>
        ) : (
          <ul className="users">
            {users.map((user) =>
              editingId === user._id ? (
                <li key={user._id}>
                  <UserForm
                    initial={user}
                    submitLabel="Save"
                    onSubmit={(changes) => handleEdit(user._id, changes)}
                    onCancel={() => setEditingId(null)}
                  />
                </li>
              ) : (
                <li key={user._id}>
                  <div>
                    <strong>{user.name}</strong>
                    <span className="muted"> · {user.email}{user.age != null && ` · ${user.age} years old`}</span>
                  </div>
                  <div className="actions">
                    <button onClick={() => setEditingId(user._id)}>Edit</button>
                    <button className="danger" onClick={() => handleDelete(user)}>Delete</button>
                  </div>
                </li>
              ),
            )}
          </ul>
        )}
      </section>
    </main>
  )
}
