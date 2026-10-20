import React from 'react';
import AddTask from './components/AddTask';
import ListTask from './components/ListTask';
import './App.css';

// App: the page layout. All task data lives in the Redux store,
// so App doesn't need to pass any props down.
function App() {
  return (
    <div className="App">
      <div className="card">
        <h1>Redux To-Do</h1>
        <AddTask />
        <ListTask />
      </div>
    </div>
  );
}

export default App;
