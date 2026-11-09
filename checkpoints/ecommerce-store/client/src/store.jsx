// store.jsx
// The app-wide state, shared with React Context:
//  - AuthProvider: who is logged in (the token is kept in localStorage)
//  - CartProvider: the cart (also kept in localStorage, so a refresh doesn't empty it)

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken } from './api';

// ---------------------------------------------------------------- auth
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(Boolean(getToken()));

  // On page load, ask the server who the saved token belongs to
  useEffect(() => {
    if (!getToken()) return;
    api('/auth/me')
      .then((d) => setUser(d.user))
      .catch((err) => {
        if (err.status === 401) setToken(null); // expired token: forget it
      })
      .finally(() => setChecking(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const d = await api('/auth/login', { method: 'POST', body: { email, password } });
    setToken(d.token);
    setUser(d.user);
    return d.user;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const d = await api('/auth/register', { method: 'POST', body: { name, email, password } });
    setToken(d.token);
    setUser(d.user);
    return d.user;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, checking, login, register, logout }), [user, checking, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

// ---------------------------------------------------------------- cart
const CART_KEY = 'kora-cart';
const CartContext = createContext(null);

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart);

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch {
      /* storage not available: the cart still works for this visit */
    }
  }, [items]);

  // Add a product (or more of it). Never more than what's in stock (max 20).
  const add = useCallback((product, qty = 1) => {
    setItems((list) => {
      const max = Math.min(product.stock, 20);
      const found = list.find((i) => i.productId === product._id);
      if (found) return list.map((i) => (i === found ? { ...i, qty: Math.min(i.qty + qty, max) } : i));
      return [...list, { productId: product._id, slug: product.slug, name: product.name, price: product.price, image: product.image, stock: product.stock, qty: Math.min(qty, max) }];
    });
  }, []);

  const setQty = useCallback((productId, qty) => {
    setItems((list) => list.map((i) => (i.productId === productId ? { ...i, qty: Math.max(1, Math.min(qty, i.stock, 20)) } : i)));
  }, []);

  const remove = useCallback((productId) => setItems((list) => list.filter((i) => i.productId !== productId)), []);
  const clear = useCallback(() => setItems([]), []);

  // Replace the saved price/stock with fresh values from the server
  // (prices may have changed since the item was added). null = not sold anymore.
  const refresh = useCallback((fresh) => {
    setItems((list) =>
      list.flatMap((i) => {
        const p = fresh[i.productId];
        if (p === null) return [];
        if (!p) return [i];
        if (p.stock === 0) return [{ ...i, price: p.price, stock: 0 }];
        return [{ ...i, name: p.name, price: p.price, image: p.image, stock: p.stock, qty: Math.min(i.qty, p.stock, 20) }];
      }),
    );
  }, []);

  const count = items.reduce((n, i) => n + i.qty, 0);
  const subtotal = Math.round(items.reduce((s, i) => s + i.price * i.qty, 0) * 100) / 100;

  const value = useMemo(() => ({ items, count, subtotal, add, setQty, remove, clear, refresh }), [items, count, subtotal, add, setQty, remove, clear, refresh]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
