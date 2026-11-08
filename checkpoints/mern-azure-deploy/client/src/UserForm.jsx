import { useState } from 'react'

// One form for both adding and editing a user.
// onSubmit must return a promise; if it fails, the error is shown under the form.
export default function UserForm({ initial = {}, submitLabel, onSubmit, onCancel, resetAfterSubmit }) {
  const empty = { name: initial.name ?? '', email: initial.email ?? '', age: initial.age ?? '' }
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      // age is optional: send a number, or nothing at all
      await onSubmit({ name: form.name, email: form.email, age: form.age === '' ? undefined : Number(form.age) })
      if (resetAfterSubmit) setForm({ name: '', email: '', age: '' })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="user-form">
      <input placeholder="Name" value={form.name} onChange={update('name')} aria-label="Name" />
      <input placeholder="Email" value={form.email} onChange={update('email')} aria-label="Email" />
      <input placeholder="Age" type="number" value={form.age} onChange={update('age')} aria-label="Age" />
      <button type="submit" disabled={saving}>{saving ? 'Saving…' : submitLabel}</button>
      {onCancel && <button type="button" onClick={onCancel}>Cancel</button>}
      {error && <p className="error">{error}</p>}
    </form>
  )
}
