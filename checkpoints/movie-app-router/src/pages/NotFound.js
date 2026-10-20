import React from 'react';
import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <div className="details-page">
      <Link to="/" className="back-link">
        ← Back to home
      </Link>
      <p className="empty-message">This page doesn't exist.</p>
    </div>
  );
}

export default NotFound;
