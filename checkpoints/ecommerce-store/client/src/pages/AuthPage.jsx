// pages/AuthPage.jsx
// Log in and Register (same page, two modes). After success, the user goes
// back to the page they wanted (e.g. checkout).

import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../store.jsx';

export default function AuthPage({ mode }) {
  const isLogin = mode === 'login';
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const goTo = state?.from ?? '/';

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  if (user && !sending) return <Navigate to={goTo} replace />;

  const field = (name) => ({ name, value: form[name], onChange: (e) => setForm({ ...form, [name]: e.target.value }), required: true });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSending(true);
    try {
      if (isLogin) await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
      navigate(goTo, { replace: true });
    } catch (err) {
      setError(err.message);
      setSending(false);
    }
  }

  return (
    <div className="page auth">
      <form className="card form" onSubmit={submit}>
        <h1>{isLogin ? 'Log in' : 'Create an account'}</h1>
        {state?.from === '/checkout' && <p className="muted">Log in or create an account to place your order. Your cart is saved.</p>}
        {!isLogin && (
          <label>
            Name
            <input {...field('name')} autoComplete="name" />
          </label>
        )}
        <label>
          Email
          <input {...field('email')} type="email" autoComplete="email" />
        </label>
        <label>
          Password
          <input {...field('password')} type="password" minLength={isLogin ? undefined : 8} autoComplete={isLogin ? 'current-password' : 'new-password'} />
          {!isLogin && <span className="muted small">At least 8 characters</span>}
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="button big full" disabled={sending}>
          {sending ? 'Please wait…' : isLogin ? 'Log in' : 'Create account'}
        </button>
        <p className="small center">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <Link to={isLogin ? '/register' : '/login'} state={state}>
            {isLogin ? 'Create one' : 'Log in'}
          </Link>
        </p>
      </form>
    </div>
  );
}
