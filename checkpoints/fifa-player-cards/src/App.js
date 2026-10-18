import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import PlayersList from './components/PlayersList';

function App() {
  return (
    <div
      className="App"
      style={{
        minHeight: '100vh',
        padding: '3rem 1rem',
        background: 'radial-gradient(circle at top, #1e5631 0%, #0b2414 70%)',
      }}
    >
      <h1
        style={{
          color: '#f9e79f',
          textAlign: 'center',
          fontWeight: 800,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: '2.5rem',
        }}
      >
        FIFA Player Cards
      </h1>
      <PlayersList />
    </div>
  );
}

export default App;
