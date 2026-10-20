import React from 'react';
import { Link } from 'react-router-dom';
import StarRating from './StarRating';

const FALLBACK_POSTER = '/images/no-poster.svg';

function MovieCard({ id, title, description, posterURL, rating }) {
  // If the poster link is broken, show a placeholder instead
  const handleImageError = (event) => {
    if (!event.target.src.endsWith(FALLBACK_POSTER)) {
      event.target.src = FALLBACK_POSTER;
    }
  };

  // The whole card is a link to the movie's description and trailer page
  return (
    <Link to={`/movies/${id}`} className="movie-card">
      <img
        className="movie-poster"
        src={posterURL || FALLBACK_POSTER}
        alt={`${title} poster`}
        onError={handleImageError}
      />
      <div className="movie-info">
        <h3 className="movie-title">{title}</h3>
        <StarRating rating={rating} />
        <p className="movie-description">{description}</p>
      </div>
    </Link>
  );
}

export default MovieCard;
