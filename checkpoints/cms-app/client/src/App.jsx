// App.jsx
// Two parts: the public website (header with the pages, posts, comments) and
// the dashboard under /dashboard (needs login), each with its own layout.

import { useEffect, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, Route, Routes, useLocation } from 'react-router';
import { api } from './api';
import { useAuth } from './auth.jsx';
import Home from './pages/Home.jsx';
import PostView from './pages/PostView.jsx';
import AuthPage from './pages/AuthPage.jsx';
import DashboardLayout from './admin/DashboardLayout.jsx';
import Overview from './admin/Overview.jsx';
import PostsList from './admin/PostsList.jsx';
import Editor from './admin/Editor.jsx';
import Categories from './admin/Categories.jsx';
import Comments from './admin/Comments.jsx';
import Users from './admin/Users.jsx';
import Profile from './admin/Profile.jsx';
import { NotFound } from './components/common.jsx';

function SiteLayout() {
  const { user } = useAuth();
  const [pages, setPages] = useState([]);
  useEffect(() => {
    api('/public/pages').then(setPages).catch(() => {});
  }, []);

  return (
    <>
      <header className="site-header">
        <div className="wrap header-row">
          <Link to="/" className="logo">
            <img src="/favicon.svg" alt="" width="30" height="30" />
            Inkwell
          </Link>
          <nav className="nav">
            <NavLink to="/" end>Posts</NavLink>
            {pages.map((p) => (
              <NavLink key={p._id} to={`/${p.slug}`}>{p.title}</NavLink>
            ))}
            {user ? <NavLink to="/dashboard" className="nav-cta">Dashboard</NavLink> : <NavLink to="/login">Log in</NavLink>}
          </nav>
        </div>
      </header>
      <main className="wrap">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="wrap">Inkwell · a MERN content management system by Chimaroke Amadi (GoMyCode checkpoint)</div>
      </footer>
    </>
  );
}

// Dashboard pages need a login; some need the editor or admin role
export function Protected({ need, children }) {
  const { user, checking, canEdit } = useAuth();
  const location = useLocation();
  if (checking) return <p className="muted center page">Loading…</p>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if ((need === 'editor' && !canEdit) || (need === 'admin' && user.role !== 'admin')) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);

  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/:slug" element={<PostView />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="/dashboard" element={<Protected><DashboardLayout /></Protected>}>
        <Route index element={<Overview />} />
        <Route path="posts" element={<PostsList />} />
        <Route path="posts/new" element={<Editor />} />
        <Route path="posts/:id" element={<Editor />} />
        <Route path="categories" element={<Protected need="editor"><Categories /></Protected>} />
        <Route path="comments" element={<Protected need="editor"><Comments /></Protected>} />
        <Route path="users" element={<Protected need="admin"><Users /></Protected>} />
        <Route path="profile" element={<Profile />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
