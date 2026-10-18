import React from 'react';

// Shows 5 stars. If onChange is given, the stars can be clicked to pick a rating.
function StarRating({ rating, onChange, size = '1.2rem' }) {
  const stars = [1, 2, 3, 4, 5];

  return (
    <div className="star-rating" style={{ fontSize: size }}>
      {stars.map((star) =>
        onChange ? (
          <button
            key={star}
            type="button"
            className={`star ${star <= rating ? 'filled' : ''}`}
            onClick={() => onChange(star)}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
          >
            ★
          </button>
        ) : (
          <span key={star} className={`star ${star <= rating ? 'filled' : ''}`}>
            ★
          </span>
        )
      )}
    </div>
  );
}

export default StarRating;
