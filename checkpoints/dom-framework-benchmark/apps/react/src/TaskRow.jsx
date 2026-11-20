import { memo, useState } from 'react';
import { PRIORITIES } from '../../../shared/tasks.js';

// memo: when the list changes, React only renders the rows whose `task`
// object changed. `dispatch` from useReducer never changes, so it doesn't
// break the memo.
function TaskRow({ task, dispatch }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(task.name);
  const [priority, setPriority] = useState(task.priority);

  function startEditing() {
    setName(task.name);
    setPriority(task.priority);
    setEditing(true);
  }

  function save(e) {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    dispatch({ type: 'update', id: task.id, name: clean, priority });
    setEditing(false);
  }

  if (editing) {
    return (
      <li className="task editing">
        <form onSubmit={save}>
          <input className="edit-name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Task name" autoFocus />
          <select className="edit-priority" value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Priority">
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <button className="save primary" type="submit">Save</button>
          <button className="cancel" type="button" onClick={() => setEditing(false)}>Cancel</button>
        </form>
      </li>
    );
  }

  return (
    <li className="task">
      <span className={`prio prio-${task.priority}`}>{task.priority}</span>
      <span className="name">{task.name}</span>
      <button className="edit" onClick={startEditing}>Edit</button>
      <button className="delete" onClick={() => dispatch({ type: 'remove', id: task.id })}>Delete</button>
    </li>
  );
}

export default memo(TaskRow);
