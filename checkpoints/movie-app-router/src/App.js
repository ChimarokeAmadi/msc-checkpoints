import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import MovieDetails from './pages/MovieDetails';
import NotFound from './pages/NotFound';
import initialMovies from './movies';
import './App.css';

function App() {
  // State lives here, above the routes, so added movies and filters
  // are kept when moving between pages
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
      <Routes>
        <Route
          path="/"
          element={
            <Home
              movies={filteredMovies}
              totalCount={movies.length}
              titleFilter={titleFilter}
              rateFilter={rateFilter}
              onTitleChange={setTitleFilter}
              onRateChange={setRateFilter}
              onAdd={addMovie}
            />
          }
        />
        <Route path="/movies/:id" element={<MovieDetails movies={movies} />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

export default App;
