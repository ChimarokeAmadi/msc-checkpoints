import { useState } from 'react';

// One task. "starred" is local state that belongs to this item only.
export default function TaskItem({ task, onToggle, onDelete }) {
  const [starred, setStarred] = useState(false);

  return (
    <li className={`task ${task.done ? 'done' : ''}`}>
      <input
        type="checkbox"
        checked={task.done}
        onChange={() => onToggle(task.id)}
      />
      <span className="text">{task.text}</span>
      <button
        className={`star ${starred ? 'on' : ''}`}
        onClick={() => setStarred(!starred)}
        title="Star this task"
      >
        {starred ? '★' : '☆'}
      </button>
      <button className="delete" onClick={() => onDelete(task.id)} title="Delete">
        ✕
      </button>
    </li>
  );
}
