// admin/Users.jsx (admin only)
// Change a person's role, or switch their account off (their posts stay).

import { useEffect, useState } from 'react';
import { api, formatDate } from '../api';
import { useAuth } from '../auth.jsx';

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/users').then(setUsers).catch((err) => setError(err.message));
  }, []);

  async function update(u, changes) {
    setError('');
    try {
      const saved = await api(`/users/${u._id}`, { method: 'PATCH', body: changes });
      setUsers((list) => list.map((x) => (x._id === u._id ? { ...x, ...saved } : x)));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1>Users</h1>
      <p className="muted">
        <strong>Authors</strong> write and send for review. <strong>Editors</strong> publish and moderate. <strong>Admins</strong> also manage users.
      </p>
      {error && <p className="error" role="alert">{error}</p>}
      {!users && !error && <p className="muted">Loading…</p>}
      {users && (
        <div className="table-wrap card">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th className="num">Posts</th>
                <th>Joined</th>
                <th>Account</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const self = u._id === me._id;
                return (
                  <tr key={u._id} className={u.active ? '' : 'inactive'}>
                    <td>
                      <strong>{u.name}</strong> {self && <span className="tag">You</span>}
                      <br />
                      <span className="muted small">{u.email}</span>
                    </td>
                    <td>
                      <select aria-label={`Role of ${u.name}`} value={u.role} disabled={self} onChange={(e) => update(u, { role: e.target.value })}>
                        <option value="author">Author</option>
                        <option value="editor">Editor</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="num">{u.posts}</td>
                    <td className="small">{formatDate(u.createdAt)}</td>
                    <td>
                      {self ? (
                        <span className="muted small">Active</span>
                      ) : (
                        <button type="button" className={`link-button ${u.active ? 'danger-text' : ''}`} onClick={() => update(u, { active: !u.active })}>
                          {u.active ? 'Switch off' : 'Switch on'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
