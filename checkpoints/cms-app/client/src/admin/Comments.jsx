// admin/Comments.jsx (editors)
// Comment moderation: new comments wait in "Pending" until approved.

import { useEffect, useState } from 'react';
import { api, formatDateTime } from '../api';
import { StatusBadge } from '../components/common.jsx';

export default function Comments() {
  const [status, setStatus] = useState('pending');
  const [list, setList] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setList(null);
    api(`/comments?status=${status}`).then(setList).catch((err) => setError(err.message));
  }, [status]);

  async function change(c, next) {
    try {
      await api(`/comments/${c._id}`, { method: 'PATCH', body: { status: next } });
      setList((l) => l.filter((x) => x._id !== c._id)); // it moves to the other tab
    } catch (err) {
      setError(err.message);
    }
  }
  async function remove(c) {
    if (!window.confirm('Delete this comment for good?')) return;
    try {
      await api(`/comments/${c._id}`, { method: 'DELETE' });
      setList((l) => l.filter((x) => x._id !== c._id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1>Comments</h1>
      <div className="tabs" role="tablist">
        {[['pending', 'Waiting for approval'], ['approved', 'Approved']].map(([v, label]) => (
          <button key={v} type="button" role="tab" aria-selected={status === v} className={status === v ? 'active' : ''} onClick={() => setStatus(v)}>
            {label}
          </button>
        ))}
      </div>
      {error && <p className="error">{error}</p>}
      {!list && !error && <p className="muted">Loading…</p>}
      {list?.length === 0 && <div className="card empty">No comments here.</div>}
      <ul className="comment-admin-list">
        {list?.map((c) => (
          <li key={c._id} className="card">
            <p className="meta">
              <strong>{c.name}</strong> on{' '}
              {c.post ? (
                <a href={`/${c.post.slug}`} target="_blank" rel="noreferrer">{c.post.title}</a>
              ) : (
                'a deleted post'
              )}{' '}
              · {formatDateTime(c.createdAt)} <StatusBadge status={c.status} />
            </p>
            <p className="comment-body">{c.body}</p>
            <div className="actions">
              {c.status === 'pending' ? (
                <button type="button" className="button small-button" onClick={() => change(c, 'approved')}>Approve</button>
              ) : (
                <button type="button" className="button secondary small-button" onClick={() => change(c, 'pending')}>Hide again</button>
              )}
              <button type="button" className="button danger small-button" onClick={() => remove(c)}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
