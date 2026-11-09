// pages/Home.jsx
// The landing page: a welcome banner, the categories and the featured products.

import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api, FREE_SHIPPING_FROM, money } from '../api';
import ProductCard from '../components/ProductCard.jsx';

export default function Home() {
  const [featured, setFeatured] = useState([]);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api('/products?featured=true&limit=8'), api('/products/categories')])
      .then(([f, c]) => {
        setFeatured(f.products);
        setCategories(c.filter((x) => x.count > 0));
      })
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">New season, same good prices</p>
          <h1>Everyday things for your kitchen, desk and bag.</h1>
          <p className="hero-text">Simple, well-made products. Free delivery on orders from {money(FREE_SHIPPING_FROM)}, and you pay when it arrives.</p>
          <Link to="/products" className="button big">Shop all products</Link>
        </div>
        <img src="/products/canvas-tote-bag.svg" alt="" className="hero-image" />
      </section>

      {error && <p className="error">{error}</p>}

      {categories.length > 0 && (
        <section>
          <h2>Shop by category</h2>
          <div className="chips">
            {categories.map((c) => (
              <Link key={c.name} className="chip" to={`/products?category=${encodeURIComponent(c.name)}`}>
                {c.name} <span className="muted">{c.count}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="section-head">
          <h2>Featured</h2>
          <Link to="/products">See everything →</Link>
        </div>
        <div className="grid">
          {featured.map((p) => (
            <ProductCard key={p._id} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
