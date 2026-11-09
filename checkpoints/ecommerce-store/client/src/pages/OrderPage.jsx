// pages/OrderPage.jsx
// One order: what was bought, where it goes, its status. Shown right after
// checkout as the confirmation, and from "My orders".

import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { api, money } from '../api';
import StatusBadge from '../components/StatusBadge.jsx';

export default function OrderPage() {
  const { id } = useParams();
  const { state } = useLocation();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api(`/orders/${id}`).then(setOrder).catch((err) => setError(err.message));
  }, [id]);

  async function cancel() {
    if (!window.confirm('Cancel this order?')) return;
    setBusy(true);
    try {
      setOrder(await api(`/orders/${id}/cancel`, { method: 'POST' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (error && !order) {
    return (
      <div className="page center">
        <h1>{error}</h1>
        <Link to="/orders" className="button">My orders</Link>
      </div>
    );
  }
  if (!order) return <p className="muted center page">Loading…</p>;

  return (
    <div className="page narrow">
      {state?.justPlaced && (
        <div className="card thanks" role="status">
          <h1>Thank you, your order is placed!</h1>
          <p>You'll pay {money(order.total)} in cash when it's delivered.</p>
        </div>
      )}
      <div className="section-head">
        <h2>Order #{order._id.slice(-6).toUpperCase()}</h2>
        <StatusBadge status={order.status} />
      </div>
      <p className="muted">Placed on {new Date(order.createdAt).toLocaleString()}</p>
      {error && <p className="error">{error}</p>}

      <ul className="cart-list card">
        {order.items.map((i) => (
          <li key={i.product} className="cart-item">
            <img src={i.image} alt="" />
            <div className="cart-info">
              <span>{i.name}</span>
              <span className="muted">
                {i.qty} × {money(i.price)}
              </span>
            </div>
            <strong className="line-total">{money(i.qty * i.price)}</strong>
          </li>
        ))}
      </ul>

      <div className="two-cards">
        <div className="card">
          <h3>Delivery to</h3>
          <p>
            {order.shipping.fullName}
            <br />
            {order.shipping.address}, {order.shipping.city}
            <br />
            {order.shipping.phone}
          </p>
        </div>
        <div className="card">
          <h3>Payment: {order.paymentMethod}</h3>
          <dl>
            <dt>Subtotal</dt>
            <dd>{money(order.subtotal)}</dd>
            <dt>Delivery</dt>
            <dd>{order.shippingFee === 0 ? 'Free' : money(order.shippingFee)}</dd>
            <dt className="total">Total</dt>
            <dd className="total">{money(order.total)}</dd>
          </dl>
        </div>
      </div>

      <div className="actions">
        <Link to="/orders" className="button secondary">All my orders</Link>
        {order.status === 'pending' && (
          <button type="button" className="button danger" disabled={busy} onClick={cancel}>
            Cancel order
          </button>
        )}
      </div>
    </div>
  );
}
