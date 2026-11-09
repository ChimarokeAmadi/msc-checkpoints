// api.js
// One small helper for every call to the backend. It adds the login token
// (if any), sends/receives JSON and turns error answers into normal JS errors
// with the server's message, so pages can just show err.message.

const TOKEN_KEY = 'kora-token';

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};
export const setToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private mode: the user just stays logged in until the tab closes */
  }
};

export async function api(path, { method = 'GET', body } = {}) {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// Prices are shown in US dollars everywhere
const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
export const money = (n) => formatter.format(n);

export const FREE_SHIPPING_FROM = 50;
export const SHIPPING_FEE = 5;
