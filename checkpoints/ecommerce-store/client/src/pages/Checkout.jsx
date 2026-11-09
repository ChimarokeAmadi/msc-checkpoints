// pages/Checkout.jsx
// Delivery details + order summary. Placing the order sends only product ids
// and quantities: the server works out the prices and checks the stock.

import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { api, FREE_SHIPPING_FROM, money, SHIPPING_FEE } from '../api';
import { useAuth, useCart } from '../store.jsx';

export default function Checkout() {
  const { user } = useAuth();
  const { items, subtotal, clear } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: user.name, address: '', city: '', phone: '' });
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  if (items.length === 0 && !sending) return <Navigate to="/cart" replace />;

  const shipping = subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE;
  const field = (name) => ({ name, value: form[name], onChange: (e) => setForm({ ...form, [name]: e.target.value }), required: true });

  async function placeOrder(e) {
    e.preventDefault();
    setError('');
    setSending(true);
    try {
      const order = await api('/orders', {
        method: 'POST',
        body: { items: items.map((i) => ({ productId: i.productId, qty: i.qty })), shipping: form },
      });
      clear();
      navigate(`/orders/${order._id}`, { replace: true, state: { justPlaced: true } });
    } catch (err) {
      setError(err.message);
      setSending(false);
    }
  }

  return (
    <div className="page">
      <h1>Checkout</h1>
      <div className="cart-layout">
        <form className="card form" onSubmit={placeOrder}>
          <h2>Delivery details</h2>
          <label>
            Full name
            <input {...field('fullName')} autoComplete="name" />
          </label>
          <label>
            Address
            <input {...field('address')} autoComplete="street-address" placeholder="Street and number" />
          </label>
          <div className="two">
            <label>
              City
              <input {...field('city')} autoComplete="address-level2" />
            </label>
            <label>
              Phone
              <input {...field('phone')} type="tel" autoComplete="tel" />
            </label>
          </div>
          <h2>Payment</h2>
          <label className="radio">
            <input type="radio" checked readOnly /> Cash on delivery
          </label>
          <p className="muted small">This is a student demo shop: there are no online payments and nothing will really be delivered.</p>
          {error && (
            <p className="error" role="alert">
              {error} {error.includes('left') || error.includes('stock') ? <Link to="/cart">Update your cart</Link> : null}
            </p>
          )}
          <button className="button big full" disabled={sending}>
            {sending ? 'Placing your order…' : `Place order · ${money(subtotal + shipping)}`}
          </button>
        </form>

        <aside className="summary card">
          <h2>Your order</h2>
          <ul className="mini-list">
            {items.map((i) => (
              <li key={i.productId}>
                <span>
                  {i.qty} × {i.name}
                </span>
                <span>{money(i.price * i.qty)}</span>
              </li>
            ))}
          </ul>
          <dl>
            <dt>Subtotal</dt>
            <dd>{money(subtotal)}</dd>
            <dt>Delivery</dt>
            <dd>{shipping === 0 ? 'Free' : money(shipping)}</dd>
            <dt className="total">Total</dt>
            <dd className="total">{money(subtotal + shipping)}</dd>
          </dl>
        </aside>
      </div>
    </div>
  );
}
