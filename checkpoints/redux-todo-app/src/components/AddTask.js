import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { addTask } from '../redux/tasksSlice';

// AddTask: a form to type a description and add it as a new task
function AddTask() {
  const dispatch = useDispatch();
  // What's being typed is local to this form, so it stays in component state
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!description.trim()) {
      setError('Please write a description first.');
      return;
    }

    dispatch(addTask(description.trim()));
    setDescription('');
    setError('');
  };

  return (
    <form className="add-task" onSubmit={handleSubmit}>
      <div className="add-task-row">
        <input
          type="text"
          placeholder="What do you need to do?"
          value={description}
          onChange={(event) => {
            setDescription(event.target.value);
            if (error) setError('');
          }}
          className={error ? 'invalid' : ''}
        />
        <button type="submit" className="primary-button">
          Add
        </button>
      </div>
      {error && <p className="error">{error}</p>}
    </form>
  );
}

export default AddTask;
