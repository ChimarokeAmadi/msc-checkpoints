import React, { useState } from 'react';
import StarRating from './StarRating';

const emptyForm = { title: '', description: '', posterURL: '', rating: 0 };

function AddMovie({ onAdd }) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const updateField = (field, value) => {
    setForm({ ...form, [field]: value });
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!form.title.trim() || !form.description.trim()) {
      setError('Please enter a title and a description.');
      return;
    }
    if (form.rating === 0) {
      setError('Please choose a rating.');
      return;
    }

    onAdd({
      title: form.title.trim(),
      description: form.description.trim(),
      posterURL: form.posterURL.trim(),
      rating: form.rating,
    });

    setForm(emptyForm);
    setError('');
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button type="button" className="add-button" onClick={() => setIsOpen(true)}>
        + Add a movie
      </button>
    );
  }

  return (
    <form className="add-movie-form" onSubmit={handleSubmit}>
      <h2>Add a new movie</h2>

      <input
        type="text"
        placeholder="Title"
        value={form.title}
        onChange={(event) => updateField('title', event.target.value)}
      />
      <textarea
        placeholder="Description"
        rows="3"
        value={form.description}
        onChange={(event) => updateField('description', event.target.value)}
      />
      <input
        type="url"
        placeholder="Poster URL (optional)"
        value={form.posterURL}
        onChange={(event) => updateField('posterURL', event.target.value)}
      />

      <div className="form-rating">
        <span>Rating:</span>
        <StarRating rating={form.rating} onChange={(star) => updateField('rating', star)} size="1.5rem" />
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="form-buttons">
        <button type="submit" className="add-button">
          Add movie
        </button>
        <button
          type="button"
          className="cancel-button"
          onClick={() => {
            setForm(emptyForm);
            setError('');
            setIsOpen(false);
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default AddMovie;
