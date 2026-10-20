import React from 'react';
import { Link, useParams } from 'react-router-dom';
import StarRating from '../components/StarRating';

const FALLBACK_POSTER = '/images/no-poster.svg';

function MovieDetails({ movies }) {
  // The :id part of the URL, e.g. /movies/3 -> "3"
  const { id } = useParams();
  const movie = movies.find((m) => String(m.id) === id);

  if (!movie) {
    return (
      <div className="details-page">
        <Link to="/" className="back-link">
          ← Back to home
        </Link>
        <p className="empty-message">Sorry, we couldn't find that movie.</p>
      </div>
    );
  }

  const { title, description, posterURL, rating, trailerLink } = movie;

  return (
    <div className="details-page">
      <Link to="/" className="back-link">
        ← Back to home
      </Link>

      <div className="details-header">
        <img
          className="details-poster"
          src={posterURL || FALLBACK_POSTER}
          alt={`${title} poster`}
          onError={(event) => {
            if (!event.target.src.endsWith(FALLBACK_POSTER)) event.target.src = FALLBACK_POSTER;
          }}
        />
        <div>
          <h1>{title}</h1>
          <StarRating rating={rating} size="1.6rem" />
          <p className="details-description">{description}</p>
        </div>
      </div>

      <h2>Trailer</h2>
      {trailerLink ? (
        <div className="trailer-wrapper">
          <iframe
            src={trailerLink}
            title={`${title} trailer`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <p className="empty-message">No trailer available for this movie.</p>
      )}
    </div>
  );
}

export default MovieDetails;
