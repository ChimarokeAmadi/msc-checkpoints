// admin/Profile.jsx
// My name and short bio (the bio is shown under my posts).

import { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth.jsx';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ name: user.name, bio: user.bio ?? '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      const d = await api('/auth/me', { method: 'PUT', body: form });
      setUser(d.user);
      setMessage('Profile saved');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="narrow-form">
      <h1>Profile</h1>
      <form className="card form" onSubmit={submit}>
        <p className="muted small">
          {user.email} · <span className={`role role-${user.role}`}>{user.role}</span>
        </p>
        <label>
          Name
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={80} />
        </label>
        <label>
          Short bio
          <textarea rows="3" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} maxLength={300} placeholder="Shown under your posts" />
        </label>
        {message && <p className="success" role="status">{message}</p>}
        {error && <p className="error" role="alert">{error}</p>}
        <button className="button">Save</button>
      </form>
    </div>
  );
}
