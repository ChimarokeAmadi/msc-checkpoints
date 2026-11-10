// components/common.jsx
// Small pieces used in several pages.

import { Link } from 'react-router';

export function NotFound() {
  return (
    <div className="page center">
      <h1>Page not found</h1>
      <p className="muted">This page doesn't exist, or it isn't published.</p>
      <Link className="button" to="/">Back to the posts</Link>
    </div>
  );
}

// Status label: the word is always written, the colour only helps
const LABELS = { draft: 'Draft', review: 'In review', published: 'Published', pending: 'Pending', approved: 'Approved' };
export function StatusBadge({ status }) {
  return <span className={`status status-${status}`}>{LABELS[status] ?? status}</span>;
}
