import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { toggleTask, editTask, deleteTask } from '../redux/tasksSlice';

// Task: one to-do item. It can be marked done/not done, edited or deleted.
function Task({ id, description, isDone }) {
  const dispatch = useDispatch();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(description);
  const [error, setError] = useState('');

  const startEditing = () => {
    setDraft(description);
    setError('');
    setIsEditing(true);
  };

  const saveEdit = (event) => {
    event.preventDefault();
    if (!draft.trim()) {
      setError('The description can’t be empty.');
      return;
    }
    dispatch(editTask({ id, description: draft.trim() }));
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <li className="task editing">
        <form onSubmit={saveEdit} className="edit-form">
          <input
            type="text"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              if (error) setError('');
            }}
            className={error ? 'invalid' : ''}
            aria-label="Edit task description"
            autoFocus
          />
          <button type="submit" className="primary-button">
            Save
          </button>
          <button type="button" className="secondary-button" onClick={() => setIsEditing(false)}>
            Cancel
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </li>
    );
  }

  return (
    <li className={`task ${isDone ? 'done' : ''}`}>
      <label className="task-label">
        <input
          type="checkbox"
          checked={isDone}
          onChange={() => dispatch(toggleTask(id))}
        />
        <span className="task-description">{description}</span>
      </label>

      <div className="task-actions">
        <button type="button" className="text-button" onClick={startEditing}>
          Edit
        </button>
        <button type="button" className="text-button danger" onClick={() => dispatch(deleteTask(id))}>
          Delete
        </button>
      </div>
    </li>
  );
}

export default Task;
