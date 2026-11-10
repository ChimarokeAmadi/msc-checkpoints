// admin/PostsList.jsx
// All the content (or only mine, for authors), with status tabs, a type
// filter and a search box. Clicking a title opens the editor.

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api, formatDateTime } from '../api';
import { useAuth } from '../auth.jsx';
import { StatusBadge } from '../components/common.jsx';

const TABS = [
  ['', 'All'],
  ['draft', 'Drafts'],
  ['review', 'In review'],
  ['published', 'Published'],
];

export default function PostsList() {
  const { canEdit } = useAuth();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? '';
  const type = params.get('type') ?? '';
  const [search, setSearch] = useState('');
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState('');

  const set = (k, v) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next);
  };

  useEffect(() => {
    const q = new URLSearchParams();
    if (status) q.set('status', status);
    if (type) q.set('type', type);
    if (search.trim()) q.set('search', search.trim());
    const t = setTimeout(() => {
      api(`/posts?${q}`).then(setPosts).catch((err) => setError(err.message));
    }, search ? 250 : 0);
    return () => clearTimeout(t);
  }, [status, type, search]);

  return (
    <div>
      <div className="section-head">
        <h1>{canEdit ? 'All content' : 'My posts'}</h1>
        <Link to="/dashboard/posts/new" className="button">+ New post</Link>
      </div>
      <div className="tabs" role="tablist">
        {TABS.map(([v, label]) => (
          <button key={v} type="button" role="tab" aria-selected={status === v} className={status === v ? 'active' : ''} onClick={() => set('status', v)}>
            {label}
          </button>
        ))}
      </div>
      <div className="toolbar">
        <input type="search" placeholder="Search titles…" aria-label="Search titles" value={search} onChange={(e) => setSearch(e.target.value)} />
        {canEdit && (
          <select aria-label="Type" value={type} onChange={(e) => set('type', e.target.value)}>
            <option value="">Posts and pages</option>
            <option value="post">Posts only</option>
            <option value="page">Pages only</option>
          </select>
        )}
      </div>
      {error && <p className="error">{error}</p>}
      {!posts && !error && <p className="muted">Loading…</p>}
      {posts && (
        <div className="table-wrap card">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                {canEdit && <th>Author</th>}
                <th>Category</th>
                <th>Last change</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p._id}>
                  <td>
                    <Link to={`/dashboard/posts/${p._id}`} className="row-title">{p.title}</Link>
                    {p.type === 'page' && <span className="tag">Page</span>}
                    <br />
                    <span className="muted small">/{p.slug}</span>
                  </td>
                  <td><StatusBadge status={p.status} /></td>
                  {canEdit && <td>{p.author?.name}</td>}
                  <td>{p.category?.name ?? <span className="muted">-</span>}</td>
                  <td className="small">{formatDateTime(p.updatedAt)}</td>
                </tr>
              ))}
              {posts.length === 0 && (
                <tr>
                  <td colSpan="5" className="muted center">Nothing here yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
