// admin/Editor.jsx
// The post editor: title, Markdown body with a small toolbar and a preview,
// and a side panel with the status buttons, URL, category, tags, cover and
// the revision history. Works for new posts (/dashboard/posts/new) and
// existing ones (/dashboard/posts/:id). Cmd/Ctrl+S saves.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { api, COVERS, formatDateTime } from '../api';
import { useAuth } from '../auth.jsx';
import { renderMarkdown } from '../markdown';
import { StatusBadge } from '../components/common.jsx';

const EMPTY = { title: '', slug: '', excerpt: '', body: '', cover: COVERS[0], category: '', tags: '', type: 'post', menuOrder: 0, status: 'draft' };

// Post from the server -> form values
const toForm = (p) => ({
  title: p.title,
  slug: p.slug,
  excerpt: p.excerpt ?? '',
  body: p.body ?? '',
  cover: p.cover ?? '',
  category: p.category?._id ?? p.category ?? '',
  tags: (p.tags ?? []).join(', '),
  type: p.type,
  menuOrder: p.menuOrder ?? 0,
  status: p.status,
});

// Toolbar buttons: text to put before/after the selected text
const TOOLS = [
  ['B', 'Bold', '**', '**'],
  ['I', 'Italic', '_', '_'],
  ['H2', 'Heading', '\n## ', ''],
  ['• List', 'List', '\n- ', ''],
  ['Link', 'Link', '[', '](https://)'],
  ['Code', 'Code', '`', '`'],
  ['❝', 'Quote', '\n> ', ''],
];

function Revisions({ postId, version, canModify, onRestored }) {
  const [list, setList] = useState(null);
  const [open, setOpen] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/posts/${postId}/revisions`).then(setList).catch((err) => setError(err.message));
  }, [postId, version]);

  async function restore(rev) {
    if (!window.confirm(`Restore the version from ${formatDateTime(rev.createdAt)}? The current text is kept as a revision too.`)) return;
    try {
      onRestored(await api(`/posts/${postId}/revisions/${rev._id}/restore`, { method: 'POST' }));
      setOpen(null);
    } catch (err) {
      setError(err.message);
    }
  }

  if (error) return <p className="error small">{error}</p>;
  if (!list) return <p className="muted small">Loading…</p>;
  if (list.length === 0) return <p className="muted small">No older versions yet. Every save keeps the previous text here.</p>;
  return (
    <ul className="revisions">
      {list.map((r) => (
        <li key={r._id}>
          <button type="button" className="link-button" onClick={() => setOpen(open === r._id ? null : r._id)}>
            {formatDateTime(r.createdAt)}
          </button>
          <span className="muted small"> by {r.editedBy?.name ?? '?'}</span>
          {open === r._id && (
            <div className="revision-preview">
              <strong>{r.title}</strong>
              <div className="prose small" dangerouslySetInnerHTML={{ __html: renderMarkdown(r.body) }} />
              {canModify && (
                <button type="button" className="button secondary small-button" onClick={() => restore(r)}>
                  Restore this version
                </button>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function Editor() {
  const { id } = useParams();
  const isNew = !id;
  const { canEdit, user } = useAuth();
  const navigate = useNavigate();
  const bodyRef = useRef(null);
  const justCreated = useRef(null); // id of a post we just created here (no need to reload it)

  const [form, setForm] = useState(EMPTY);
  const [saved, setSaved] = useState(EMPTY); // last saved values, to know if there are changes
  const [meta, setMeta] = useState(null); // author, dates, canModify
  const [categories, setCategories] = useState([]);
  const [tab, setTab] = useState('write');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [version, setVersion] = useState(0); // bumps after each save, to reload revisions
  const [loading, setLoading] = useState(!isNew);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);
  const canModify = isNew || meta?.canModify;

  useEffect(() => {
    api('/categories').then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    // After the first save of a new post, the URL changes to its id: the form
    // already has everything, so don't reload (and keep the "Saved" message)
    if (id && justCreated.current === id) {
      justCreated.current = null;
      return;
    }
    setError('');
    setNotice('');
    if (isNew) {
      setForm(EMPTY);
      setSaved(EMPTY);
      setMeta(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    api(`/posts/${id}`)
      .then(({ post, canModify }) => {
        const f = toForm(post);
        setForm(f);
        setSaved(f);
        setMeta({ ...post, canModify });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  // Warn before closing the tab with unsaved changes
  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'number' ? Number(e.target.value) : e.target.value }));

  const save = useCallback(
    async (status = form.status, message = 'Saved') => {
      if (!form.title.trim()) {
        setError('Give your post a title first');
        return;
      }
      setBusy(true);
      setError('');
      setNotice('');
      const body = { ...form, status, category: form.category || null };
      if (isNew && !form.slug) delete body.slug;
      try {
        const post = isNew ? await api('/posts', { method: 'POST', body }) : await api(`/posts/${id}`, { method: 'PUT', body });
        const f = toForm(post);
        setForm(f);
        setSaved(f);
        setMeta((m) => ({ ...m, ...post, author: m?.author ?? { name: user.name }, canModify: canEdit || post.status !== 'published' }));
        setVersion((v) => v + 1);
        setNotice(message);
        if (isNew) {
          justCreated.current = post._id;
          navigate(`/dashboard/posts/${post._id}`, { replace: true });
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setBusy(false);
      }
    },
    [form, isNew, id, canEdit, navigate, user.name],
  );

  // Cmd+S / Ctrl+S saves
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (canModify && !busy) save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save, canModify, busy]);

  async function remove() {
    if (!window.confirm(`Delete “${form.title}”? Its revisions and comments are deleted too. This can't be undone.`)) return;
    try {
      await api(`/posts/${id}`, { method: 'DELETE' });
      navigate('/dashboard/posts', { replace: true });
    } catch (err) {
      setError(err.message);
    }
  }

  // Wraps the selected text in the textarea with Markdown
  function insert(before, after) {
    const el = bodyRef.current;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const next = value.slice(0, s) + before + value.slice(s, e) + after + value.slice(e);
    setForm((f) => ({ ...f, body: next }));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + before.length, e + before.length);
    });
  }

  const preview = useMemo(() => (tab === 'preview' ? renderMarkdown(form.body) : ''), [tab, form.body]);

  if (loading) return <p className="muted">Loading…</p>;
  if (!isNew && !meta) return <p className="error">{error || 'Post not found'}</p>;

  const st = form.status;
  const words = form.body.trim() ? form.body.trim().split(/\s+/).length : 0;

  return (
    <div className="editor">
      <div className="editor-top">
        <Link to="/dashboard/posts" className="small">← All {canEdit ? 'content' : 'my posts'}</Link>
        <span className="editor-state">
          {!isNew && <StatusBadge status={saved.status} />}
          <span className="muted small">{dirty ? 'Unsaved changes' : isNew ? 'New' : 'All changes saved'}</span>
        </span>
      </div>

      {!canModify && (
        <p className="notice">This post is published, so only an editor can change it now. You can still read it and its history.</p>
      )}
      {error && <p className="error" role="alert">{error}</p>}
      {notice && !dirty && <p className="success" role="status">{notice}</p>}

      <div className="editor-grid">
        <div className="editor-main">
          <input className="title-input" placeholder="Title" aria-label="Title" value={form.title} onChange={set('title')} disabled={!canModify} maxLength={140} />
          <div className="tabs small-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'write'} className={tab === 'write' ? 'active' : ''} onClick={() => setTab('write')}>
              Write
            </button>
            <button type="button" role="tab" aria-selected={tab === 'preview'} className={tab === 'preview' ? 'active' : ''} onClick={() => setTab('preview')}>
              Preview
            </button>
            {tab === 'write' && canModify && (
              <span className="toolbar-buttons">
                {TOOLS.map(([label, title, b, a]) => (
                  <button key={title} type="button" title={title} onClick={() => insert(b, a)}>
                    {label}
                  </button>
                ))}
              </span>
            )}
          </div>
          {tab === 'write' ? (
            <textarea
              ref={bodyRef}
              className="body-input"
              placeholder="Write your post in Markdown… (## Heading, **bold**, - list, [link](https://...))"
              aria-label="Body (Markdown)"
              value={form.body}
              onChange={set('body')}
              disabled={!canModify}
            />
          ) : (
            <div className="card preview-box">
              {form.body.trim() ? <div className="prose" dangerouslySetInnerHTML={{ __html: preview }} /> : <p className="muted">Nothing to preview yet.</p>}
            </div>
          )}
          <p className="muted small">
            {words} words · about {Math.max(1, Math.round(words / 200))} min read · Markdown supported
          </p>
        </div>

        <aside className="editor-side">
          <div className="card side-box">
            <h3>Publish</h3>
            {meta?.author && <p className="muted small">Author: {meta.author.name}</p>}
            {meta?.publishedAt && <p className="muted small">First published {formatDateTime(meta.publishedAt)}</p>}
            {canModify && (
              <div className="side-actions">
                <button type="button" className="button secondary full" disabled={busy} onClick={() => save()}>
                  {st === 'published' ? 'Update' : 'Save draft'}
                </button>
                {!canEdit && st === 'draft' && (
                  <button type="button" className="button full" disabled={busy} onClick={() => save('review', 'Sent for review. An editor will publish it.')}>
                    Send for review
                  </button>
                )}
                {!canEdit && st === 'review' && (
                  <button type="button" className="button secondary full" disabled={busy} onClick={() => save('draft', 'Moved back to draft')}>
                    Back to draft
                  </button>
                )}
                {canEdit && st !== 'published' && (
                  <button type="button" className="button full" disabled={busy} onClick={() => save('published', 'Published! It is live on the site.')}>
                    Publish
                  </button>
                )}
                {canEdit && st === 'published' && (
                  <button type="button" className="button secondary full" disabled={busy} onClick={() => save('draft', 'Unpublished: it is a draft again')}>
                    Unpublish
                  </button>
                )}
              </div>
            )}
            {saved.status === 'published' && !isNew && (
              <a className="small" href={`/${saved.slug}`} target="_blank" rel="noreferrer">
                View on the site ↗
              </a>
            )}
            {!isNew && canModify && (
              <button type="button" className="link-button danger-text small" onClick={remove}>
                Delete
              </button>
            )}
          </div>

          <div className="card side-box form">
            <h3>Details</h3>
            {canEdit && (
              <label>
                Type
                <select value={form.type} onChange={set('type')}>
                  <option value="post">Post (blog article)</option>
                  <option value="page">Page (in the menu)</option>
                </select>
              </label>
            )}
            <label>
              URL
              <span className="slug-input">
                <span className="muted">/</span>
                <input value={form.slug} onChange={set('slug')} placeholder="made from the title" disabled={!canModify} />
              </span>
            </label>
            {form.type === 'post' ? (
              <>
                <label>
                  Category
                  <select value={form.category} onChange={set('category')} disabled={!canModify}>
                    <option value="">No category</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Tags
                  <input value={form.tags} onChange={set('tags')} placeholder="css, layout" disabled={!canModify} />
                  <span className="muted small">Separate with commas</span>
                </label>
              </>
            ) : (
              <label>
                Menu position
                <input type="number" value={form.menuOrder} onChange={set('menuOrder')} disabled={!canModify} />
              </label>
            )}
            <label>
              Excerpt
              <textarea rows="3" value={form.excerpt} onChange={set('excerpt')} maxLength={300} placeholder="One or two sentences shown on the home page" disabled={!canModify} />
            </label>
          </div>

          {form.type === 'post' && (
            <div className="card side-box">
              <h3>Cover</h3>
              <div className="cover-picker">
                {COVERS.map((c) => (
                  <button key={c} type="button" className={form.cover === c ? 'picked' : ''} disabled={!canModify} onClick={() => setForm((f) => ({ ...f, cover: c }))} aria-label={`Use ${c.split('/').pop()}`}>
                    <img src={c} alt="" />
                  </button>
                ))}
              </div>
              <label className="small">
                …or an image link (https://)
                <input value={COVERS.includes(form.cover) ? '' : form.cover} onChange={set('cover')} placeholder="https://…" disabled={!canModify} />
              </label>
            </div>
          )}

          {!isNew && (
            <div className="card side-box">
              <h3>History</h3>
              <Revisions
                postId={id}
                version={version}
                canModify={canModify}
                onRestored={(post) => {
                  const f = toForm(post);
                  setForm(f);
                  setSaved(f);
                  setVersion((v) => v + 1);
                  setNotice('Older version restored');
                }}
              />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
