// admin/Overview.jsx
// The first dashboard page: a few numbers, and what needs attention
// (posts waiting for review, comments waiting for approval, my drafts).

import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api, formatDateTime } from '../api';
import { useAuth } from '../auth.jsx';
import { StatusBadge } from '../components/common.jsx';

export default function Overview() {
  const { user, canEdit } = useAuth();
  const [stats, setStats] = useState(null);
  const [review, setReview] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api('/stats'),
      canEdit ? api('/posts?status=review') : Promise.resolve([]),
      api('/posts?status=draft&mine=true'),
    ])
      .then(([s, r, d]) => {
        setStats(s);
        setReview(r);
        setDrafts(d.filter((p) => p.author?._id === user._id).slice(0, 5));
      })
      .catch((err) => setError(err.message));
  }, [canEdit, user._id]);

  if (error) return <p className="error">{error}</p>;
  if (!stats) return <p className="muted">Loading…</p>;

  const tiles = [
    ['Published', stats.posts.published, '/dashboard/posts?status=published'],
    ['In review', stats.posts.review, '/dashboard/posts?status=review'],
    ['Drafts', stats.posts.draft, '/dashboard/posts?status=draft'],
    ...(canEdit ? [['Pages', stats.pages, '/dashboard/posts?type=page'], ['Comments to check', stats.pendingComments, '/dashboard/comments']] : []),
    ...(user.role === 'admin' ? [['Users', stats.users, '/dashboard/users']] : []),
  ];

  return (
    <div>
      <h1>Hello, {user.name.split(' ')[0]}</h1>
      <p className="muted">
        {canEdit
          ? 'You can write, edit and publish everything.'
          : 'You can write posts and send them for review. An editor will publish them.'}
      </p>
      <div className="stats">
        {tiles.map(([label, n, to]) => (
          <Link key={label} to={to} className="card stat">
            <span className="muted small">{label}</span>
            <strong>{n}</strong>
          </Link>
        ))}
      </div>

      {canEdit && (
        <section className="dash-section">
          <h2>Waiting for review</h2>
          {review.length === 0 ? (
            <p className="muted">Nothing to review. 🎉</p>
          ) : (
            <ul className="simple-list card">
              {review.map((p) => (
                <li key={p._id}>
                  <Link to={`/dashboard/posts/${p._id}`}>{p.title}</Link>
                  <span className="muted small">
                    by {p.author?.name} · {formatDateTime(p.updatedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="dash-section">
        <h2>My drafts</h2>
        {drafts.length === 0 ? (
          <p className="muted">
            No drafts. <Link to="/dashboard/posts/new">Start a new post</Link>
          </p>
        ) : (
          <ul className="simple-list card">
            {drafts.map((p) => (
              <li key={p._id}>
                <Link to={`/dashboard/posts/${p._id}`}>{p.title}</Link>
                <span className="muted small">
                  <StatusBadge status={p.status} /> {formatDateTime(p.updatedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
