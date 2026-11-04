// FIXED VERSION: the app after debugging with React Developer Tools.
// Each fix is marked with "FIX #n" and explained in DEBUGGING.md.
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

  // FIX #3: create a NEW array instead of changing the old one,
  // so React notices the change and re-renders
  const addTask = (text) => {
    setTasks((prev) => [...prev, { id: Date.now(), text, done: false }]);
  };

  const toggleTask = (id) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const deleteTask = (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const visibleTasks = tasks.filter((t) =>
    filter === 'active' ? !t.done : filter === 'done' ? t.done : true
  );

  return (
    <>
      <Banner version="fixed" />
      <div className="app">
        <Header title="My Task Tracker" />
        <AddTaskForm onAdd={addTask} />
        <FilterBar filter={filter} onFilterChange={setFilter} />
        {/* FIX #2: pass onToggle so the checkboxes work */}
        <TaskList tasks={visibleTasks} onToggle={toggleTask} onDelete={deleteTask} />
        <Stats tasks={tasks} />
      </div>
    </>
  );
}
