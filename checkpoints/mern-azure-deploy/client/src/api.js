// All the calls to the Express API in one place.
// The URLs are relative ("/api/users"), so the same build works locally and
// on Azure: the page and the API come from the same server.

async function request(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    // the server sends { message, errors? } -> show the details if there are any
    throw new Error(data.errors ? data.errors.join(', ') : data.message || `Error ${res.status}`)
  }
  return data
}

export const getUsers = () => request('GET', '/api/users')
export const addUser = (user) => request('POST', '/api/users', user)
export const editUser = (id, changes) => request('PUT', `/api/users/${id}`, changes)
export const deleteUser = (id) => request('DELETE', `/api/users/${id}`)
export const getHealth = () => request('GET', '/api/health')
