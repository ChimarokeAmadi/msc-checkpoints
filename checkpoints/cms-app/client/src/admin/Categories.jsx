// admin/Categories.jsx (editors)
// Add, rename and delete categories. A category that is still used by posts
// can't be deleted (the server answers 409 and we show its message).

import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Categories() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ name: '', description: '' });
  const [editing, setEditing] = useState(null); // { _id, name, description }
  const [error, setError] = useState('');

  const load = () => api('/categories').then(setList).catch((err) => setError(err.message));
  useEffect(() => {
    load();
  }, []);

  async function run(fn) {
    setError('');
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1>Categories</h1>
      <form
        className="card form inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            await api('/categories', { method: 'POST', body: form });
            setForm({ name: '', description: '' });
          });
        }}
      >
        <label>
          New category
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={40} placeholder="e.g. Design" />
        </label>
        <label>
          Description
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={200} placeholder="Optional" />
        </label>
        <button className="button">Add</button>
      </form>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="table-wrap card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th className="num">Posts</th>
              <th><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) =>
              editing?._id === c._id ? (
                <tr key={c._id}>
                  <td><input aria-label="Name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></td>
                  <td><input aria-label="Description" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></td>
                  <td className="num">{c.posts}</td>
                  <td className="row-actions">
                    <button type="button" className="link-button" onClick={() => run(async () => {
                      await api(`/categories/${c._id}`, { method: 'PUT', body: { name: editing.name, description: editing.description } });
                      setEditing(null);
                    })}>Save</button>
                    <button type="button" className="link-button" onClick={() => setEditing(null)}>Cancel</button>
                  </td>
                </tr>
              ) : (
                <tr key={c._id}>
                  <td><strong>{c.name}</strong><br /><span className="muted small">/?category={c.slug}</span></td>
                  <td className="muted">{c.description}</td>
                  <td className="num">{c.posts}</td>
                  <td className="row-actions">
                    <button type="button" className="link-button" onClick={() => setEditing({ _id: c._id, name: c.name, description: c.description })}>Rename</button>
                    <button type="button" className="link-button danger-text" onClick={() => window.confirm(`Delete “${c.name}”?`) && run(() => api(`/categories/${c._id}`, { method: 'DELETE' }))}>Delete</button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
