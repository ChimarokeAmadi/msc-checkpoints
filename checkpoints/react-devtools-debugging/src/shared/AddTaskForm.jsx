import { useState } from 'react';

// Form with a controlled input. Calls onAdd(text) when submitted.
export default function AddTaskForm({ onAdd }) {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return; // ignore empty tasks
    onAdd(text.trim());
    setText('');
  };

  return (
    <form className="add-form" onSubmit={handleSubmit}>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a new task..."
      />
      <button type="submit">Add</button>
    </form>
  );
}
