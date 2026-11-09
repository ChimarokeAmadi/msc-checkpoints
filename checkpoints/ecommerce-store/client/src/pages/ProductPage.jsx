// pages/ProductPage.jsx
// One product: big picture, description, quantity and "Add to cart".

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { api, money } from '../api';
import { useCart } from '../store.jsx';
import { StockNote } from '../components/ProductCard.jsx';

export default function ProductPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { add, items } = useCart();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setProduct(null);
    setError('');
    api(`/products/${encodeURIComponent(slug)}`).then(setProduct).catch((err) => setError(err.message));
  }, [slug]);

  if (error) {
    return (
      <div className="page center">
        <h1>{error}</h1>
        <Link className="button" to="/products">Back to the shop</Link>
      </div>
    );
  }
  if (!product) return <p className="muted center page">Loading…</p>;

  const inCart = items.find((i) => i.productId === product._id)?.qty ?? 0;
  const canBuy = Math.min(product.stock, 20) - inCart; // how many more can go in the cart

  return (
    <div className="page">
      <p className="breadcrumbs">
        <Link to="/products">Shop</Link> / <Link to={`/products?category=${encodeURIComponent(product.category)}`}>{product.category}</Link>
      </p>
      <div className="product-detail">
        <img src={product.image} alt={product.name} className="detail-image" />
        <div>
          <span className="category">{product.category}</span>
          <h1>{product.name}</h1>
          <p className="detail-price">{money(product.price)}</p>
          <StockNote stock={product.stock} />
          <p className="description">{product.description}</p>

          {canBuy > 0 ? (
            <div className="buy-row">
              <label>
                Quantity
                <select value={Math.min(qty, canBuy)} onChange={(e) => setQty(Number(e.target.value))}>
                  {Array.from({ length: canBuy }, (_, i) => i + 1).map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="button big"
                onClick={() => {
                  add(product, Math.min(qty, canBuy));
                  setAdded(true);
                  setQty(1);
                }}
              >
                Add to cart
              </button>
            </div>
          ) : (
            <p className="muted">{product.stock === 0 ? 'This product is out of stock right now.' : 'You already have all the available stock in your cart.'}</p>
          )}
          {added && (
            <p className="success" role="status">
              Added to your cart.{' '}
              <button type="button" className="link-button" onClick={() => navigate('/cart')}>
                View cart ({inCart})
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
