// BUGGY VERSION: this is the app before debugging.
// The bugs are marked with "BUG #n" and explained in DEBUGGING.md.
import { useState } from 'react';
import Banner from '../shared/Banner';
import AddTaskForm from '../shared/AddTaskForm';
import FilterBar from '../shared/FilterBar';
import initialTasks from '../shared/initialTasks';
import Header from './Header';
import TaskList from './TaskList';
import Stats from './Stats';

export default function App() {
  const [tasks, setTasks] = useState(initialTasks);
  const [filter, setFilter] = useState('all');

  // BUG #3: pushes into the existing array and passes the same array back.
  // React sees the same reference, so it doesn't re-render.
  const addTask = (text) => {
    tasks.push({ id: Date.now(), text, done: false });
    setTasks(tasks);
  };

  const toggleTask = (id) => {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const deleteTask = (id) => {
    setTasks(tasks.filter((t) => t.id !== id));
  };

  const visibleTasks = tasks.filter((t) =>
    filter === 'active' ? !t.done : filter === 'done' ? t.done : true
  );

  return (
    <>
      <Banner version="buggy" />
      <div className="app">
        <Header title="My Task Tracker" />
        <AddTaskForm onAdd={addTask} />
        <FilterBar filter={filter} onFilterChange={setFilter} />
        {/* BUG #2: onToggle is never passed down */}
        <TaskList tasks={visibleTasks} onDelete={deleteTask} />
        <Stats tasks={tasks} />
      </div>
    </>
  );
}
