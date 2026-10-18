import React from 'react';
import { Card } from 'react-bootstrap';

// Inline styles for the card
const styles = {
  card: {
    width: '17rem',
    border: 'none',
    borderRadius: '1.25rem',
    overflow: 'hidden',
    background: 'linear-gradient(160deg, #f9e79f 0%, #d4ac0d 45%, #7d6608 100%)',
    boxShadow: '0 15px 35px rgba(0, 0, 0, 0.5)',
    color: '#1b1b1b',
  },
  imageWrapper: {
    position: 'relative',
  },
  image: {
    height: '300px',
    objectFit: 'cover',
    objectPosition: 'top',
    borderBottom: '4px solid #1b1b1b',
  },
  jersey: {
    position: 'absolute',
    top: '0.75rem',
    left: '0.75rem',
    width: '3.5rem',
    height: '3.5rem',
    borderRadius: '50%',
    background: '#1b1b1b',
    color: '#f9e79f',
    fontSize: '1.6rem',
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.4)',
  },
  name: {
    fontSize: '1.4rem',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    textAlign: 'center',
    marginBottom: '0.75rem',
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    columnGap: '0.75rem',
    rowGap: '0.35rem',
    margin: 0,
  },
  label: {
    fontWeight: 700,
    textTransform: 'uppercase',
    fontSize: '0.75rem',
    letterSpacing: '0.08em',
    alignSelf: 'center',
  },
  value: {
    margin: 0,
    fontWeight: 600,
  },
};

// All attributes are destructured from props.
// The values after "=" are the default props, used when an attribute is missing.
function Player({
  name = 'Unknown Player',
  team = 'Free Agent',
  nationality = 'Unknown',
  jerseyNumber = 0,
  age = 'N/A',
  imageUrl = '/images/default-player.svg',
}) {
  return (
    <Card style={styles.card}>
      <div style={styles.imageWrapper}>
        <Card.Img variant="top" src={imageUrl} alt={name} style={styles.image} />
        <span style={styles.jersey}>{jerseyNumber}</span>
      </div>

      <Card.Body>
        <Card.Title style={styles.name}>{name}</Card.Title>
        <dl style={styles.stats}>
          <dt style={styles.label}>Team</dt>
          <dd style={styles.value}>{team}</dd>
          <dt style={styles.label}>Nation</dt>
          <dd style={styles.value}>{nationality}</dd>
          <dt style={styles.label}>Age</dt>
          <dd style={styles.value}>{age}</dd>
        </dl>
      </Card.Body>
    </Card>
  );
}

export default Player;
