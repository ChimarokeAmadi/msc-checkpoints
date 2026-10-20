import React from 'react';
import StarRating from './StarRating';

function Filter({ title, rate, onTitleChange, onRateChange }) {
  // Clicking the same star again clears the rating filter
  const handleRateChange = (star) => {
    onRateChange(star === rate ? 0 : star);
  };

  return (
    <div className="filter">
      <input
        type="text"
        className="filter-title"
        placeholder="Search by title..."
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
      />

      <div className="filter-rate">
        <span>Minimum rating:</span>
        <StarRating rating={rate} onChange={handleRateChange} size="1.5rem" />
      </div>

      {(title || rate > 0) && (
        <button
          type="button"
          className="clear-button"
          onClick={() => {
            onTitleChange('');
            onRateChange(0);
          }}
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

export default Filter;
