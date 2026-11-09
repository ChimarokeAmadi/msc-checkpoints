// pages/Admin.jsx
// Admin dashboard, two tabs:
//  - Products: add, edit, delete products and change stock
//  - Orders: every order, and buttons to move it forward (ship, deliver, cancel)

import { useEffect, useState } from 'react';
import { api, money } from '../api';
import StatusBadge from '../components/StatusBadge.jsx';

const CATEGORIES = ['Kitchen', 'Bags', 'Tech', 'Home', 'Stationery', 'Fashion'];
const IMAGES = [
  'ceramic-coffee-mug', 'insulated-water-bottle', 'bamboo-cutting-board', 'canvas-tote-bag', 'everyday-backpack', 'wireless-headphones',
  'portable-power-bank', 'desk-lamp', 'potted-succulent', 'dotted-notebook', 'classic-sunglasses', 'cotton-t-shirt', 'placeholder',
].map((s) => `/products/${s}.svg`);
const EMPTY = { name: '', category: 'Kitchen', price: '', stock: '', description: '', image: '/products/placeholder.svg', featured: false };

function ProductForm({ initial, onSaved, onCancel }) {
  const [form, setForm] = useState(initial ?? EMPTY);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSending(true);
    const body = { ...form, price: Number(form.price), stock: Number(form.stock) };
    try {
      const saved = initial?._id
        ? await api(`/products/${initial._id}`, { method: 'PUT', body })
        : await api('/products', { method: 'POST', body });
      onSaved(saved);
    } catch (err) {
      setError(err.message);
      setSending(false);
    }
  }

  return (
    <form className="card form admin-form" onSubmit={submit}>
      <h3>{initial?._id ? `Edit “${initial.name}”` : 'New product'}</h3>
      <div className="two">
        <label>
          Name
          <input value={form.name} onChange={set('name')} required maxLength={100} />
        </label>
        <label>
          Category
          <select value={form.category} onChange={set('category')}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label>
          Price ($)
          <input type="number" min="0.01" step="0.01" value={form.price} onChange={set('price')} required />
        </label>
        <label>
          Stock
          <input type="number" min="0" step="1" value={form.stock} onChange={set('stock')} required />
        </label>
      </div>
      <label>
        Description
        <textarea rows="3" value={form.description} onChange={set('description')} maxLength={2000} />
      </label>
      <div className="two">
        <label>
          Picture
          <select value={IMAGES.includes(form.image) ? form.image : ''} onChange={set('image')}>
            {IMAGES.map((src) => <option key={src} value={src}>{src.split('/').pop().replace('.svg', '')}</option>)}
            {!IMAGES.includes(form.image) && <option value="">Custom URL</option>}
          </select>
        </label>
        <label>
          …or a picture URL
          <input value={form.image} onChange={set('image')} placeholder="https://…" />
        </label>
      </div>
      <label className="radio">
        <input type="checkbox" checked={form.featured} onChange={set('featured')} /> Show on the home page (featured)
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="actions">
        <button className="button" disabled={sending}>{sending ? 'Saving…' : 'Save product'}</button>
        <button type="button" className="button secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function ProductsTab() {
  const [products, setProducts] = useState([]);
  const [editing, setEditing] = useState(null); // null, 'new' or a product
  const [error, setError] = useState('');

  const load = () => api('/products?limit=50&sort=name').then((r) => setProducts(r.products)).catch((err) => setError(err.message));
  useEffect(() => {
    load();
  }, []);

  async function remove(p) {
    if (!window.confirm(`Delete “${p.name}”? Old orders keep their copy of it.`)) return;
    try {
      await api(`/products/${p._id}`, { method: 'DELETE' });
      setProducts((list) => list.filter((x) => x._id !== p._id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <div className="section-head">
        <p className="muted">{products.length} products</p>
        {!editing && <button type="button" className="button" onClick={() => setEditing('new')}>+ Add product</button>}
      </div>
      {error && <p className="error">{error}</p>}
      {editing && (
        <ProductForm
          key={editing._id ?? 'new'}
          initial={editing === 'new' ? null : editing}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
      <div className="table-wrap card">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th className="num">Price</th>
              <th className="num">Stock</th>
              <th><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p._id}>
                <td>
                  <span className="table-product">
                    <img src={p.image} alt="" />
                    {p.name} {p.featured && <span className="tag">Featured</span>}
                  </span>
                </td>
                <td>{p.category}</td>
                <td className="num">{money(p.price)}</td>
                <td className={`num ${p.stock === 0 ? 'stock out' : p.stock <= 5 ? 'stock low' : ''}`}>{p.stock}</td>
                <td className="row-actions">
                  <button type="button" className="link-button" onClick={() => setEditing({ ...p })}>Edit</button>
                  <button type="button" className="link-button danger-text" onClick={() => remove(p)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// What the admin can do next with an order in each status
const NEXT = { pending: [['shipped', 'Mark shipped'], ['cancelled', 'Cancel']], shipped: [['delivered', 'Mark delivered'], ['cancelled', 'Cancel']], delivered: [], cancelled: [] };

function OrdersTab() {
  const [orders, setOrders] = useState(null);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api('/orders').then(setOrders).catch((err) => setError(err.message));
  }, []);

  async function move(order, status) {
    if (status === 'cancelled' && !window.confirm('Cancel this order? The items go back in stock.')) return;
    try {
      const updated = await api(`/orders/${order._id}/status`, { method: 'PATCH', body: { status } });
      setOrders((list) => list.map((o) => (o._id === order._id ? { ...updated, user: o.user } : o)));
    } catch (err) {
      setError(err.message);
    }
  }

  if (!orders) return error ? <p className="error">{error}</p> : <p className="muted">Loading…</p>;
  const shown = filter ? orders.filter((o) => o.status === filter) : orders;
  const revenue = orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0);

  return (
    <>
      <div className="stats">
        <div className="card stat"><span className="muted small">Orders</span><strong>{orders.length}</strong></div>
        <div className="card stat"><span className="muted small">To ship</span><strong>{orders.filter((o) => o.status === 'pending').length}</strong></div>
        <div className="card stat"><span className="muted small">Sales (not cancelled)</span><strong>{money(revenue)}</strong></div>
      </div>
      <div className="section-head">
        <select aria-label="Filter by status" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All statuses</option>
          {Object.keys(NEXT).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="table-wrap card">
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Items</th>
              <th className="num">Total</th>
              <th>Status</th>
              <th><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {shown.map((o) => (
              <tr key={o._id}>
                <td>
                  <strong>#{o._id.slice(-6).toUpperCase()}</strong>
                  <br />
                  <span className="muted small">{new Date(o.createdAt).toLocaleString()}</span>
                </td>
                <td>
                  {o.user?.name ?? 'Deleted user'}
                  <br />
                  <span className="muted small">{o.shipping.city}</span>
                </td>
                <td className="small">{o.items.map((i) => `${i.qty} × ${i.name}`).join(', ')}</td>
                <td className="num">{money(o.total)}</td>
                <td><StatusBadge status={o.status} /></td>
                <td className="row-actions">
                  {NEXT[o.status].map(([s, label]) => (
                    <button key={s} type="button" className={`link-button ${s === 'cancelled' ? 'danger-text' : ''}`} onClick={() => move(o, s)}>
                      {label}
                    </button>
                  ))}
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan="6" className="muted center">No orders here yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function Admin() {
  const [tab, setTab] = useState('orders');
  return (
    <div className="page">
      <h1>Admin</h1>
      <div className="tabs" role="tablist">
        {[['orders', 'Orders'], ['products', 'Products']].map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'orders' ? <OrdersTab /> : <ProductsTab />}
    </div>
  );
}
