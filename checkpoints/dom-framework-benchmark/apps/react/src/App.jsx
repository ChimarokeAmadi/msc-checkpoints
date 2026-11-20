import { useReducer, useState } from 'react';
import { PRIORITIES, buildTasks, createTask, editedName, nextPriority, pickEvenly } from '../../../shared/tasks.js';
import { measure } from '../../../shared/bench.js';
import TaskRow from './TaskRow.jsx';

// All the changes to the list go through this reducer. It never changes a
// task object: it makes a new one, so React.memo in TaskRow can see which
// rows really changed and skip the others.
function tasksReducer(tasks, action) {
  switch (action.type) {
    case 'add':
      return [...tasks, action.task];
    case 'update':
      return tasks.map((t) => (t.id === action.id ? { ...t, name: action.name, priority: action.priority } : t));
    case 'remove':
      return tasks.filter((t) => t.id !== action.id);
    case 'replace':
      return action.tasks;
    case 'updateMany': {
      const ids = new Set(pickEvenly(tasks).map((t) => t.id));
      return tasks.map((t) => (ids.has(t.id) ? { ...t, name: editedName(t.name), priority: nextPriority(t.priority) } : t));
    }
    case 'removeMany': {
      const ids = new Set(pickEvenly(tasks).map((t) => t.id));
      return tasks.filter((t) => !ids.has(t.id));
    }
    default:
      throw new Error(`Unknown action ${action.type}`);
  }
}

export default function App() {
  const [tasks, dispatch] = useReducer(tasksReducer, []);
  const [name, setName] = useState('');
  const [priority, setPriority] = useState('medium');

  function addTask(e) {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    dispatch({ type: 'add', task: createTask(clean, priority) });
    setName('');
  }

  const render = (count) => measure(`Render ${count}`, () => dispatch({ type: 'replace', tasks: buildTasks(count) }));

  return (
    <main className="app">
      <header>
        <h1>To-do <small>React</small></h1>
        <p className="count">{tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}</p>
      </header>

      <form className="add" onSubmit={addTask}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="What needs doing?" aria-label="Task name" />
        <select value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Priority">
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <button className="primary" type="submit">Add</button>
      </form>

      <section className="bench" aria-label="Benchmark">
        <span>Benchmark</span>
        <button id="bench-100" onClick={() => render(100)}>Render 100</button>
        <button id="bench-500" onClick={() => render(500)}>Render 500</button>
        <button id="bench-1000" onClick={() => render(1000)}>Render 1000</button>
        <button id="bench-update" onClick={() => measure('Update 50', () => dispatch({ type: 'updateMany' }))}>Update 50</button>
        <button id="bench-delete" onClick={() => measure('Delete 50', () => dispatch({ type: 'removeMany' }))}>Delete 50</button>
        <button id="bench-clear" onClick={() => measure('Clear', () => dispatch({ type: 'replace', tasks: [] }))}>Clear</button>
      </section>

      {tasks.length === 0 ? (
        <p className="empty">No tasks yet.</p>
      ) : (
        <ul className="tasks">
          {tasks.map((task) => <TaskRow key={task.id} task={task} dispatch={dispatch} />)}
        </ul>
      )}
    </main>
  );
}
