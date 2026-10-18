import React from 'react';
import Player from './Player';
import players from '../players';

function PlayersList() {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '2rem',
      }}
    >
      {players.map((player) => (
        // The spread operator passes every attribute as its own prop
        <Player key={player.name} {...player} />
      ))}
    </div>
  );
}

export default PlayersList;
