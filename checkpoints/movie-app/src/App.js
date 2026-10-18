import React, { useState } from 'react';
import Filter from './components/Filter';
import MovieList from './components/MovieList';
import AddMovie from './components/AddMovie';
import initialMovies from './movies';
import './App.css';

function App() {
  const [movies, setMovies] = useState(initialMovies);
  const [titleFilter, setTitleFilter] = useState('');
  const [rateFilter, setRateFilter] = useState(0);

  const addMovie = (movie) => {
    setMovies([...movies, { ...movie, id: Date.now() }]);
  };

  const filteredMovies = movies.filter(
    (movie) =>
      movie.title.toLowerCase().includes(titleFilter.trim().toLowerCase()) &&
      movie.rating >= rateFilter
  );

  return (
    <div className="App">
      <header className="app-header">
        <h1>🎬 My Favorite Movies</h1>
        <p>
          Showing {filteredMovies.length} of {movies.length} movies
        </p>
      </header>

      <Filter
        title={titleFilter}
        rate={rateFilter}
        onTitleChange={setTitleFilter}
        onRateChange={setRateFilter}
      />

      <AddMovie onAdd={addMovie} />

      <MovieList movies={filteredMovies} />
    </div>
  );
}

export default App;
