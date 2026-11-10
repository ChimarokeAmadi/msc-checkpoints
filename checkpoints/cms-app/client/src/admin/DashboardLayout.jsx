// admin/DashboardLayout.jsx
// The dashboard frame: a side menu (top menu on phones) and the current page.
// The menu only shows what the user's role is allowed to use.

import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../auth.jsx';

export default function DashboardLayout() {
  const { user, canEdit, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="dash">
      <aside className="dash-side">
        <Link to="/" className="logo">
          <img src="/favicon.svg" alt="" width="28" height="28" />
          Inkwell
        </Link>
        <Link to="/dashboard/posts/new" className="button full new-post">+ New post</Link>
        <nav className="dash-nav">
          <NavLink to="/dashboard" end>Overview</NavLink>
          <NavLink to="/dashboard/posts">{canEdit ? 'All content' : 'My posts'}</NavLink>
          {canEdit && <NavLink to="/dashboard/categories">Categories</NavLink>}
          {canEdit && <NavLink to="/dashboard/comments">Comments</NavLink>}
          {user.role === 'admin' && <NavLink to="/dashboard/users">Users</NavLink>}
          <NavLink to="/dashboard/profile">Profile</NavLink>
        </nav>
        <div className="dash-user">
          <span>
            <strong>{user.name}</strong>
            <span className={`role role-${user.role}`}>{user.role}</span>
          </span>
          <span className="dash-user-links">
            <Link to="/">View site</Link>
            <button
              type="button"
              className="link-button"
              onClick={() => {
                logout();
                navigate('/');
              }}
            >
              Log out
            </button>
          </span>
        </div>
      </aside>
      <main className="dash-main">
        <Outlet />
      </main>
    </div>
  );
}
