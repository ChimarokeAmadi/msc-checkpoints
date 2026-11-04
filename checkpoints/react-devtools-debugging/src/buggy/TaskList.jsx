import TaskItem from '../shared/TaskItem';

export default function TaskList({ tasks, onToggle, onDelete }) {
  if (tasks.length === 0) return <p className="empty">No tasks here.</p>;

  return (
    <ul className="task-list">
      {tasks.map((task, index) => (
        // BUG #5: using the array index as the key. When a task is deleted,
        // the keys shift and the local "starred" state ends up on the wrong task.
        <TaskItem key={index} task={task} onToggle={onToggle} onDelete={onDelete} />
      ))}
    </ul>
  );
}
