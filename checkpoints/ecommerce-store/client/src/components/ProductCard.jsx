// components/ProductCard.jsx
// One product in a grid: picture, name, price and an "Add to cart" button.

import { Link } from 'react-router';
import { money } from '../api';
import { useCart } from '../store.jsx';

export function StockNote({ stock }) {
  if (stock === 0) return <span className="stock out">Out of stock</span>;
  if (stock <= 5) return <span className="stock low">Only {stock} left</span>;
  return <span className="stock ok">In stock</span>;
}

export default function ProductCard({ product }) {
  const { add, items } = useCart();
  const inCart = items.find((i) => i.productId === product._id)?.qty ?? 0;
  const canAdd = product.stock > inCart && inCart < 20;

  return (
    <article className="card product-card">
      <Link to={`/products/${product.slug}`} className="product-image">
        <img src={product.image} alt={product.name} loading="lazy" />
      </Link>
      <div className="product-body">
        <span className="category">{product.category}</span>
        <h3>
          <Link to={`/products/${product.slug}`}>{product.name}</Link>
        </h3>
        <div className="price-row">
          <strong className="price">{money(product.price)}</strong>
          <StockNote stock={product.stock} />
        </div>
        <button type="button" className="button full" disabled={!canAdd} onClick={() => add(product)}>
          {product.stock === 0 ? 'Out of stock' : inCart ? `Add another (${inCart} in cart)` : 'Add to cart'}
        </button>
      </div>
    </article>
  );
}
