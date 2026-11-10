// pages/Home.jsx
// The public home page: published posts, newest first, with search, a
// category filter, tags and pages. The filters live in the URL (?category=backend).

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api, formatDate } from '../api';

export function PostCard({ post, big = false }) {
  return (
    <article className={`card post-card ${big ? 'big' : ''}`}>
      <Link to={`/${post.slug}`} className="cover-link" tabIndex={-1} aria-hidden="true">
        <img src={post.cover || '/covers/cover-1.svg'} alt="" loading="lazy" />
      </Link>
      <div className="post-card-body">
        {post.category && (
          <Link className="kicker" to={`/?category=${post.category.slug}`}>
            {post.category.name}
          </Link>
        )}
        <h2>
          <Link to={`/${post.slug}`}>{post.title}</Link>
        </h2>
        {post.excerpt && <p className="muted">{post.excerpt}</p>}
        <p className="meta">
          {post.author?.name} · {formatDate(post.publishedAt)} · {post.readingMinutes} min read
        </p>
      </div>
    </article>
  );
}

export default function Home() {
  const [params, setParams] = useSearchParams();
  const search = params.get('search') ?? '';
  const category = params.get('category') ?? '';
  const tag = params.get('tag') ?? '';
  const page = Number(params.get('page')) || 1;

  const [typed, setTyped] = useState(search);
  const [categories, setCategories] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const update = (changes) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next, { replace: 'search' in changes });
  };

  useEffect(() => {
    if (typed === search) return;
    const t = setTimeout(() => update({ search: typed.trim() }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typed]);

  useEffect(() => {
    api('/public/categories').then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    let current = true;
    const q = new URLSearchParams({ page });
    if (search) q.set('search', search);
    if (category) q.set('category', category);
    if (tag) q.set('tag', tag);
    api(`/public/posts?${q}`)
      .then((r) => current && (setResult(r), setError('')))
      .catch((err) => current && setError(err.message));
    return () => {
      current = false;
    };
  }, [search, category, tag, page]);

  const filtering = search || category || tag;
  const catName = categories.find((c) => c.slug === category)?.name;

  return (
    <div className="page">
      {!filtering && page === 1 && (
        <section className="intro">
          <h1>Notes on building for the web</h1>
          <p className="muted">Short, friendly posts about HTML, CSS, JavaScript and the backend, written and published with Inkwell.</p>
        </section>
      )}

      <div className="filters">
        <input type="search" placeholder="Search posts…" aria-label="Search posts" value={typed} onChange={(e) => setTyped(e.target.value)} />
        <div className="chips" role="list">
          <button type="button" className={`chip ${!category ? 'active' : ''}`} onClick={() => update({ category: '' })}>
            All
          </button>
          {categories
            .filter((c) => c.count > 0)
            .map((c) => (
              <button key={c.slug} type="button" className={`chip ${category === c.slug ? 'active' : ''}`} onClick={() => update({ category: c.slug })}>
                {c.name} <span className="muted">{c.count}</span>
              </button>
            ))}
        </div>
      </div>

      {filtering && result && (
        <p className="muted">
          {result.total} post{result.total === 1 ? '' : 's'}
          {search && <> matching “{search}”</>}
          {catName && <> in {catName}</>}
          {tag && <> tagged #{tag}</>} ·{' '}
          <button type="button" className="link-button" onClick={() => (setTyped(''), setParams({}))}>
            clear
          </button>
        </p>
      )}

      {error && <p className="error">{error}</p>}
      {!result && !error && <p className="muted">Loading…</p>}
      {result?.total === 0 && <div className="card empty">No posts found.</div>}
      {result && result.posts.length > 0 && (
        <div className="post-grid">
          {result.posts.map((p, i) => (
            <PostCard key={p._id} post={p} big={i === 0 && !filtering && page === 1} />
          ))}
        </div>
      )}
      {result?.pages > 1 && (
        <nav className="pager" aria-label="Pages">
          <button type="button" className="button secondary" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>
            ← Newer
          </button>
          <span>
            Page {page} of {result.pages}
          </span>
          <button type="button" className="button secondary" disabled={page >= result.pages} onClick={() => update({ page: String(page + 1) })}>
            Older →
          </button>
        </nav>
      )}
    </div>
  );
}
