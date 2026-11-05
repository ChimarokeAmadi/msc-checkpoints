import { useEffect, useState } from 'react';
import axios from 'axios';
import './UserList.css';

const API_URL = 'https://jsonplaceholder.typicode.com/users';

// Two letters for the avatar circle: "Leanne Graham" -> "LG"
const initials = (name) =>
  name
    .split(' ')
    .filter((word) => /^[A-Z]/.test(word))
    .slice(0, 2)
    .map((word) => word[0])
    .join('');

function UserList() {
  // The list of users from the API
  const [listOfUser, setListOfUser] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  // Fetch the users once, when the component first appears on the screen
  useEffect(() => {
    const controller = new AbortController();

    axios
      .get(API_URL, { signal: controller.signal })
      .then((response) => {
        setListOfUser(response.data);
        setError(null);
      })
      .catch((err) => {
        if (axios.isCancel(err)) return; // the component was removed before the answer came
        setError('Could not load the users. Please check your connection and try again.');
      })
      .finally(() => {
        // a cancelled request must not end the loading state (the new request is still running)
        if (!controller.signal.aborted) setLoading(false);
      });

    // Cleanup: cancel the request if the component is removed
    return () => controller.abort();
  }, []); // [] = run only once

  const visibleUsers = listOfUser.filter((user) =>
    [user.name, user.username, user.email, user.address.city, user.company.name]
      .join(' ')
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );

  if (loading) {
    return (
      <div className="state" role="status">
        <div className="spinner" />
        Loading users...
      </div>
    );
  }

  if (error) {
    return (
      <div className="state error" role="alert">
        {error}
      </div>
    );
  }

  return (
    <section>
      <div className="toolbar">
        <input
          type="search"
          className="search"
          placeholder="Search by name, email, city or company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search users"
        />
        <span className="count">
          {visibleUsers.length} of {listOfUser.length} users
        </span>
      </div>

      {visibleUsers.length === 0 ? (
        <p className="state">No user matches "{search}".</p>
      ) : (
        <ul className="user-grid">
          {visibleUsers.map((user) => (
            <li key={user.id} className="user-card">
              <div className="card-header">
                <div className="avatar" aria-hidden="true">
                  {initials(user.name)}
                </div>
                <div>
                  <h2>{user.name}</h2>
                  <p className="username">@{user.username}</p>
                </div>
              </div>

              <ul className="details">
                <li>
                  <span aria-hidden="true">✉️</span>
                  <a href={`mailto:${user.email}`}>{user.email}</a>
                </li>
                <li>
                  <span aria-hidden="true">📞</span>
                  {user.phone}
                </li>
                <li>
                  <span aria-hidden="true">🌐</span>
                  <a href={`https://${user.website}`} target="_blank" rel="noreferrer">
                    {user.website}
                  </a>
                </li>
                <li>
                  <span aria-hidden="true">📍</span>
                  {user.address.street}, {user.address.city}
                </li>
              </ul>

              <div className="company">
                <strong>{user.company.name}</strong>
                <em>"{user.company.catchPhrase}"</em>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default UserList;
