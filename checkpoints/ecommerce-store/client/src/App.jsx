// App.jsx
// The layout (header + footer) and the list of pages (React Router).

import { useEffect } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useLocation } from 'react-router';
import { useAuth, useCart } from './store.jsx';
import Home from './pages/Home.jsx';
import Shop from './pages/Shop.jsx';
import ProductPage from './pages/ProductPage.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import OrderPage from './pages/OrderPage.jsx';
import MyOrders from './pages/MyOrders.jsx';
import AuthPage from './pages/AuthPage.jsx';
import Admin from './pages/Admin.jsx';

// Pages that need a logged-in user (or an admin) send visitors to /login first,
// and come back here after login
function Protected({ admin = false, children }) {
  const { user, checking } = useAuth();
  const location = useLocation();
  if (checking) return <p className="muted center">Loading…</p>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (admin && !user.isAdmin) return <Navigate to="/" replace />;
  return children;
}

function Header() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  return (
    <header className="site-header">
      <div className="wrap header-row">
        <Link to="/" className="logo">
          <img src="/favicon.svg" alt="" width="30" height="30" />
          Kora Market
        </Link>
        <nav className="nav">
          <NavLink to="/products">Shop</NavLink>
          {user && <NavLink to="/orders">My orders</NavLink>}
          {user?.isAdmin && <NavLink to="/admin">Admin</NavLink>}
          {user ? (
            <button type="button" className="link-button" onClick={logout} title={`Logged in as ${user.email}`}>
              Log out
            </button>
          ) : (
            <NavLink to="/login">Log in</NavLink>
          )}
          <NavLink to="/cart" className="cart-link" aria-label={`Cart, ${count} items`}>
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.5L21 8H6.2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><circle cx="10" cy="20.5" r="1.5" fill="currentColor" /><circle cx="17" cy="20.5" r="1.5" fill="currentColor" /></svg>
            {count > 0 && <span className="badge">{count}</span>}
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

function NotFound() {
  return (
    <div className="center page">
      <h1>Page not found</h1>
      <p className="muted">This page doesn't exist.</p>
      <Link className="button" to="/products">Go to the shop</Link>
    </div>
  );
}

export default function App() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]); // new page starts at the top

  return (
    <>
      <Header />
      <main className="wrap">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Shop />} />
          <Route path="/products/:slug" element={<ProductPage />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="/checkout" element={<Protected><Checkout /></Protected>} />
          <Route path="/orders" element={<Protected><MyOrders /></Protected>} />
          <Route path="/orders/:id" element={<Protected><OrderPage /></Protected>} />
          <Route path="/admin" element={<Protected admin><Admin /></Protected>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="site-footer">
        <div className="wrap">
          Kora Market · a GoMyCode MERN project by Chimaroke Amadi · Demo shop: no real payments, orders are paid on delivery.
        </div>
      </footer>
    </>
  );
}
