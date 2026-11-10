// pages/PostView.jsx
// One published post or page, rendered from Markdown, with its comments.

import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { api, formatDate } from '../api';
import { useAuth } from '../auth.jsx';
import { renderMarkdown } from '../markdown';
import { NotFound } from '../components/common.jsx';

function CommentForm({ slug }) {
  const [form, setForm] = useState({ name: '', body: '', website: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      const r = await api(`/public/posts/${slug}/comments`, { method: 'POST', body: form });
      setMessage(r.message);
      setForm({ name: form.name, body: '', website: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <form className="card form comment-form" onSubmit={submit}>
      <h3>Leave a comment</h3>
      <label>
        Name
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={60} autoComplete="name" />
      </label>
      <label>
        Comment
        <textarea rows="4" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required maxLength={2000} />
      </label>
      {/* Hidden from people, but spam bots fill it in (see routes/public.js) */}
      <label className="trap" aria-hidden="true">
        Website
        <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
      </label>
      {message && <p className="success" role="status">{message}</p>}
      {error && <p className="error" role="alert">{error}</p>}
      <button className="button" disabled={sending}>{sending ? 'Sending…' : 'Post comment'}</button>
    </form>
  );
}

export default function PostView() {
  const { slug } = useParams();
  const { user, canEdit } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setData(null);
    setError(null);
    api(`/public/posts/${encodeURIComponent(slug)}`)
      .then((d) => {
        setData(d);
        document.title = `${d.post.title} · Inkwell`;
      })
      .catch((err) => setError(err));
    return () => {
      document.title = 'Inkwell';
    };
  }, [slug]);

  const html = useMemo(() => (data ? renderMarkdown(data.post.body) : ''), [data]);

  if (error?.status === 404) return <NotFound />;
  if (error) return <p className="error page">{error.message}</p>;
  if (!data) return <p className="muted center page">Loading…</p>;

  const { post, comments } = data;
  const isPage = post.type === 'page';
  const canEditThis = user && (canEdit || post.author?._id === user._id);

  return (
    <article className="page article">
      <header className="article-head">
        {post.category && (
          <Link className="kicker" to={`/?category=${post.category.slug}`}>
            {post.category.name}
          </Link>
        )}
        <h1>{post.title}</h1>
        {!isPage && (
          <p className="meta">
            By {post.author?.name} · {formatDate(post.publishedAt)} · {post.readingMinutes} min read
          </p>
        )}
        {canEditThis && (
          <Link className="small" to={`/dashboard/posts/${post._id}`}>
            ✎ Edit in the dashboard
          </Link>
        )}
      </header>
      {post.cover && !isPage && <img className="article-cover" src={post.cover} alt="" />}

      {/* The HTML comes from renderMarkdown, which cleans it with DOMPurify */}
      <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />

      {post.tags?.length > 0 && (
        <p className="tags">
          {post.tags.map((t) => (
            <Link key={t} to={`/?tag=${encodeURIComponent(t)}`} className="tag">
              #{t}
            </Link>
          ))}
        </p>
      )}

      {!isPage && (
        <>
          {post.author?.bio && (
            <aside className="card author-box">
              <strong>About {post.author.name}</strong>
              <p className="muted">{post.author.bio}</p>
            </aside>
          )}
          <section className="comments">
            <h2>
              {comments.length} comment{comments.length === 1 ? '' : 's'}
            </h2>
            {comments.map((c) => (
              <div key={c._id} className="comment">
                <p className="meta">
                  <strong>{c.name}</strong> · {formatDate(c.createdAt)}
                </p>
                <p className="comment-body">{c.body}</p>
              </div>
            ))}
            <CommentForm slug={post.slug} />
          </section>
        </>
      )}
    </article>
  );
}
