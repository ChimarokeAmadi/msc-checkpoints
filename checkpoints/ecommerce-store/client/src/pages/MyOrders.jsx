// pages/MyOrders.jsx
// The logged-in customer's orders, newest first.

import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api, money } from '../api';
import StatusBadge from '../components/StatusBadge.jsx';

export default function MyOrders() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/orders/mine').then(setOrders).catch((err) => setError(err.message));
  }, []);

  return (
    <div className="page narrow">
      <h1>My orders</h1>
      {error && <p className="error">{error}</p>}
      {!orders && !error && <p className="muted">Loading…</p>}
      {orders?.length === 0 && (
        <div className="empty card">
          <p>You haven't ordered anything yet.</p>
          <Link to="/products" className="button">Start shopping</Link>
        </div>
      )}
      {orders?.length > 0 && (
        <ul className="order-list">
          {orders.map((o) => (
            <li key={o._id}>
              <Link to={`/orders/${o._id}`} className="card order-row">
                <span>
                  <strong>#{o._id.slice(-6).toUpperCase()}</strong>
                  <span className="muted small"> · {new Date(o.createdAt).toLocaleDateString()}</span>
                  <br />
                  <span className="muted small">
                    {o.items.reduce((n, i) => n + i.qty, 0)} items: {o.items.map((i) => i.name).join(', ')}
                  </span>
                </span>
                <span className="order-right">
                  <StatusBadge status={o.status} />
                  <strong>{money(o.total)}</strong>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
