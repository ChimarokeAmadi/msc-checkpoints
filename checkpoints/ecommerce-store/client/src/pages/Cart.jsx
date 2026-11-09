// pages/Cart.jsx
// The cart: change quantities, remove items, see the total, go to checkout.
// When it opens, it reloads every product from the server, so the prices and
// stock shown are the current ones.

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { api, FREE_SHIPPING_FROM, money, SHIPPING_FEE } from '../api';
import { useCart } from '../store.jsx';

export default function Cart() {
  const { items, subtotal, setQty, remove, refresh } = useCart();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const slugs = items.map((i) => [i.productId, i.slug]);
    if (!slugs.length) return setChecked(true);
    Promise.all(
      slugs.map(([id, slug]) =>
        api(`/products/${encodeURIComponent(slug)}`)
          .then((p) => [id, p])
          .catch((err) => [id, err.status === 404 ? null : undefined]),
      ),
    ).then((pairs) => {
      refresh(Object.fromEntries(pairs));
      setChecked(true);
    });
    // only once when the page opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (items.length === 0) {
    return (
      <div className="page center">
        <h1>Your cart is empty</h1>
        <p className="muted">Find something you like in the shop.</p>
        <Link to="/products" className="button">Go shopping</Link>
      </div>
    );
  }

  const outOfStock = items.some((i) => i.stock === 0);
  const shipping = subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE;

  return (
    <div className="page">
      <h1>Your cart</h1>
      <div className="cart-layout">
        <ul className="cart-list card">
          {items.map((i) => (
            <li key={i.productId} className="cart-item">
              <img src={i.image} alt="" />
              <div className="cart-info">
                <Link to={`/products/${i.slug}`}>{i.name}</Link>
                <span className="muted">{money(i.price)} each</span>
                {i.stock === 0 && <span className="stock out">Sold out: please remove it</span>}
              </div>
              <div className="qty" aria-label={`Quantity of ${i.name}`}>
                <button type="button" aria-label="One less" disabled={i.qty <= 1 || i.stock === 0} onClick={() => setQty(i.productId, i.qty - 1)}>−</button>
                <span>{i.qty}</span>
                <button type="button" aria-label="One more" disabled={i.qty >= Math.min(i.stock, 20)} onClick={() => setQty(i.productId, i.qty + 1)}>+</button>
              </div>
              <strong className="line-total">{money(i.price * i.qty)}</strong>
              <button type="button" className="link-button remove" onClick={() => remove(i.productId)}>
                Remove
              </button>
            </li>
          ))}
        </ul>

        <aside className="summary card">
          <h2>Summary</h2>
          <dl>
            <dt>Subtotal</dt>
            <dd>{money(subtotal)}</dd>
            <dt>Delivery</dt>
            <dd>{shipping === 0 ? 'Free' : money(shipping)}</dd>
            <dt className="total">Total</dt>
            <dd className="total">{money(subtotal + shipping)}</dd>
          </dl>
          {shipping > 0 && <p className="muted small">Add {money(FREE_SHIPPING_FROM - subtotal)} more for free delivery.</p>}
          <button type="button" className="button full big" disabled={!checked || outOfStock} onClick={() => navigate('/checkout')}>
            Go to checkout
          </button>
          <Link to="/products" className="small">Continue shopping</Link>
        </aside>
      </div>
    </div>
  );
}
