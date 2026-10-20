import React, { useState } from 'react';
import TaskForm from './TaskForm';

/**
 * Formats "2026-10-25" as "Oct 25, 2026".
 * The date is built from its parts so it isn't shifted by the user's time zone.
 */
function formatDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** True if the due date is before today (and the task isn't done yet). */
function isOverdue(task) {
  if (!task.dueDate || task.completed) return false;
  // Today's date as "YYYY-MM-DD" in the user's own time zone
  const now = new Date();
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
  return task.dueDate < today;
}

/**
 * TaskItem shows one task.
 * - The checkbox marks it as completed or active.
 * - Clicking the task (or the Edit button) swaps it for a pre-filled TaskForm.
 * - The Delete button asks the parent to confirm before removing it.
 */
function TaskItem({ task, onToggle, onUpdate, onDeleteRequest }) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <li className="task-item">
        <TaskForm
          initialTask={task}
          onSubmit={(changes) => {
            onUpdate(task.id, changes);
            setIsEditing(false);
          }}
          onCancel={() => setIsEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className={`task-item ${task.completed ? 'completed' : 'active'} priority-${task.priority}`}>
      <input
        type="checkbox"
        className="task-checkbox"
        checked={task.completed}
        onChange={() => onToggle(task.id)}
        aria-label={task.completed ? `Mark "${task.name}" as active` : `Mark "${task.name}" as completed`}
      />

      <button
        type="button"
        className="task-content"
        onClick={() => setIsEditing(true)}
        title="Click to edit"
      >
        <span className="task-name">{task.name}</span>
        <span className="task-description">{task.description}</span>
        <span className="task-meta">
          <span className={`priority-badge ${task.priority}`}>{task.priority}</span>
          {task.dueDate && (
            <span className={`due-date ${isOverdue(task) ? 'overdue' : ''}`}>
              {isOverdue(task) ? 'Overdue: ' : 'Due '}
              {formatDate(task.dueDate)}
            </span>
          )}
        </span>
      </button>

      <div className="task-actions">
        <button type="button" className="icon-button" onClick={() => setIsEditing(true)}>
          Edit
        </button>
        <button type="button" className="icon-button danger" onClick={() => onDeleteRequest(task)}>
          Delete
        </button>
      </div>
    </li>
  );
}

export default TaskItem;
