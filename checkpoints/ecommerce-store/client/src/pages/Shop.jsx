// pages/Shop.jsx
// All products with a search box, category filter, sorting and pages.
// The filters live in the URL (?search=mug&category=Kitchen), so a filtered
// page can be shared or refreshed.

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { api } from '../api';
import ProductCard from '../components/ProductCard.jsx';

const SORTS = [
  ['newest', 'Newest'],
  ['price-asc', 'Price: low to high'],
  ['price-desc', 'Price: high to low'],
  ['name', 'Name A–Z'],
];

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const search = params.get('search') ?? '';
  const category = params.get('category') ?? '';
  const sort = params.get('sort') ?? 'newest';
  const page = Number(params.get('page')) || 1;

  const [typed, setTyped] = useState(search);
  const [categories, setCategories] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Change one filter (and go back to page 1)
  const update = (changes) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next, { replace: 'search' in changes });
  };

  // Search while typing, but wait until the user stops for 300 ms
  useEffect(() => {
    if (typed === search) return;
    const t = setTimeout(() => update({ search: typed.trim() }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typed]);

  useEffect(() => {
    api('/products/categories').then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    let current = true;
    const q = new URLSearchParams({ sort, page, limit: 12 });
    if (search) q.set('search', search);
    if (category) q.set('category', category);
    api(`/products?${q}`)
      .then((r) => current && (setResult(r), setError('')))
      .catch((err) => current && setError(err.message));
    return () => {
      current = false;
    };
  }, [search, category, sort, page]);

  return (
    <div className="page">
      <h1>Shop</h1>
      <div className="filters">
        <input type="search" placeholder="Search products…" aria-label="Search products" value={typed} onChange={(e) => setTyped(e.target.value)} />
        <select aria-label="Category" value={category} onChange={(e) => update({ category: e.target.value })}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name} ({c.count})
            </option>
          ))}
        </select>
        <select aria-label="Sort by" value={sort} onChange={(e) => update({ sort: e.target.value === 'newest' ? '' : e.target.value })}>
          {SORTS.map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="error">{error}</p>}
      {!result && !error && <p className="muted">Loading products…</p>}
      {result && (
        <>
          <p className="muted">
            {result.total} product{result.total === 1 ? '' : 's'}
            {search && <> for “{search}”</>}
            {category && <> in {category}</>}
          </p>
          {result.total === 0 ? (
            <div className="empty card">
              <p>Nothing matches your search.</p>
              <button type="button" className="button secondary" onClick={() => (setTyped(''), setParams({}))}>
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid">
              {result.products.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          )}
          {result.pages > 1 && (
            <nav className="pager" aria-label="Pages">
              <button type="button" className="button secondary" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>
                ← Previous
              </button>
              <span>
                Page {page} of {result.pages}
              </span>
              <button type="button" className="button secondary" disabled={page >= result.pages} onClick={() => update({ page: String(page + 1) })}>
                Next →
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
