import UserList from './UserList';
import './App.css';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>👥 User Directory</h1>
        <p>Users loaded from the JSONPlaceholder API with axios</p>
      </header>
      <main className="app-main">
        <UserList />
      </main>
    </div>
  );
}

export default App;
