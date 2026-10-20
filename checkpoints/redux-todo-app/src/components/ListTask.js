import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Task from './Task';
import { selectAllTasks, selectFilter, setFilter } from '../redux/tasksSlice';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'done', label: 'Done' },
  { value: 'notDone', label: 'Not done' },
];

// ListTask: reads the tasks and the current filter from the store,
// shows the filter buttons, and renders a Task for each visible task
function ListTask() {
  const dispatch = useDispatch();
  const tasks = useSelector(selectAllTasks);
  const filter = useSelector(selectFilter);

  const counts = {
    all: tasks.length,
    done: tasks.filter((task) => task.isDone).length,
    notDone: tasks.filter((task) => !task.isDone).length,
  };

  const visibleTasks = tasks.filter((task) => {
    if (filter === 'done') return task.isDone;
    if (filter === 'notDone') return !task.isDone;
    return true;
  });

  return (
    <section>
      <div className="filters" role="group" aria-label="Filter tasks">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className={filter === value ? 'selected' : ''}
            onClick={() => dispatch(setFilter(value))}
          >
            {label} <span className="count">{counts[value]}</span>
          </button>
        ))}
      </div>

      {visibleTasks.length === 0 ? (
        <p className="empty-message">No tasks here.</p>
      ) : (
        <ul className="task-list">
          {visibleTasks.map((task) => (
            <Task key={task.id} {...task} />
          ))}
        </ul>
      )}
    </section>
  );
}

export default ListTask;
