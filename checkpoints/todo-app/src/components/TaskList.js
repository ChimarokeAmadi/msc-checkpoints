import React from 'react';
import TaskItem from './TaskItem';

/**
 * TaskList renders every task it is given as a TaskItem.
 * If there are no tasks to show, it shows a friendly message instead.
 */
function TaskList({ tasks, emptyMessage, onToggle, onUpdate, onDeleteRequest }) {
  if (tasks.length === 0) {
    return <p className="empty-message">{emptyMessage}</p>;
  }

  return (
    <ul className="task-list">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onToggle={onToggle}
          onUpdate={onUpdate}
          onDeleteRequest={onDeleteRequest}
        />
      ))}
    </ul>
  );
}

export default TaskList;
