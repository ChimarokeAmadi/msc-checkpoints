import React, { useState } from 'react';
import TaskForm from './components/TaskForm';
import TaskList from './components/TaskList';
import TaskFilters from './components/TaskFilters';
import ConfirmDialog from './components/ConfirmDialog';
import useLocalStorage from './hooks/useLocalStorage';
import './App.css';

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

/** Creates a unique id for a new task. */
function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Returns a sorted copy of the tasks, without changing the original list. */
function sortTasks(tasks, sortBy) {
  const sorted = [...tasks];

  if (sortBy === 'priority') {
    sorted.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  } else if (sortBy === 'dueDate') {
    // Tasks without a due date go to the end
    sorted.sort((a, b) => (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31'));
  } else {
    sorted.sort((a, b) => b.createdAt - a.createdAt);
  }

  return sorted;
}

/**
 * App is the root component. It owns the task list (saved in localStorage)
 * and passes the tasks and the functions that change them down to the
 * other components.
 */
function App() {
  const [tasks, setTasks] = useLocalStorage('todo-app-tasks', []);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [taskToDelete, setTaskToDelete] = useState(null);

  /** Adds a new, not-yet-completed task. */
  const addTask = (details) => {
    setTasks([...tasks, { ...details, id: createId(), completed: false, createdAt: Date.now() }]);
  };

  /** Replaces the name, description, priority and due date of one task. */
  const updateTask = (id, changes) => {
    setTasks(tasks.map((task) => (task.id === id ? { ...task, ...changes } : task)));
  };

  /** Switches a task between completed and active. */
  const toggleTask = (id) => {
    setTasks(tasks.map((task) => (task.id === id ? { ...task, completed: !task.completed } : task)));
  };

  /** Removes the task the user confirmed in the dialog. */
  const confirmDelete = () => {
    setTasks(tasks.filter((task) => task.id !== taskToDelete.id));
    setTaskToDelete(null);
  };

  const counts = {
    all: tasks.length,
    active: tasks.filter((task) => !task.completed).length,
    completed: tasks.filter((task) => task.completed).length,
  };

  const visibleTasks = sortTasks(
    tasks.filter((task) => {
      if (filter === 'active') return !task.completed;
      if (filter === 'completed') return task.completed;
      return true;
    }),
    sortBy
  );

  const emptyMessages = {
    all: 'No tasks yet. Add one above to get started!',
    active: 'Nothing left to do. Nice work!',
    completed: 'No completed tasks yet.',
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>My To-Do List</h1>
        <p>
          {counts.active} active · {counts.completed} completed
        </p>
      </header>

      <main>
        <TaskForm onSubmit={addTask} />

        <TaskFilters
          filter={filter}
          onFilterChange={setFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
          counts={counts}
        />

        <TaskList
          tasks={visibleTasks}
          emptyMessage={emptyMessages[filter]}
          onToggle={toggleTask}
          onUpdate={updateTask}
          onDeleteRequest={setTaskToDelete}
        />
      </main>

      {taskToDelete && (
        <ConfirmDialog
          message={`Delete "${taskToDelete.name}"? This can't be undone.`}
          confirmLabel="Delete"
          onConfirm={confirmDelete}
          onCancel={() => setTaskToDelete(null)}
        />
      )}
    </div>
  );
}

export default App;
