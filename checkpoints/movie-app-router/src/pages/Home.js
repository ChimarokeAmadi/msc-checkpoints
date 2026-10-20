import React from 'react';
import Filter from '../components/Filter';
import MovieList from '../components/MovieList';
import AddMovie from '../components/AddMovie';

function Home({ movies, totalCount, titleFilter, rateFilter, onTitleChange, onRateChange, onAdd }) {
  return (
    <>
      <header className="app-header">
        <h1>🎬 My Favorite Movies</h1>
        <p>
          Showing {movies.length} of {totalCount} movies
        </p>
      </header>

      <Filter
        title={titleFilter}
        rate={rateFilter}
        onTitleChange={onTitleChange}
        onRateChange={onRateChange}
      />

      <AddMovie onAdd={onAdd} />

      <MovieList movies={movies} />
    </>
  );
}

export default Home;
