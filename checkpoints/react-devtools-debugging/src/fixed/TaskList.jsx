import TaskItem from '../shared/TaskItem';

export default function TaskList({ tasks, onToggle, onDelete }) {
  if (tasks.length === 0) return <p className="empty">No tasks here.</p>;

  return (
    <ul className="task-list">
      {tasks.map((task) => (
        // FIX #5: use the task's id as the key. It never changes,
        // so each TaskItem keeps its own "starred" state.
        <TaskItem key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} />
      ))}
    </ul>
  );
}
