// App just shows the two converted components so we can see them working
import Greeting from './components/Greeting';
import Counter from './components/Counter';

const App = () => {
  return (
    <main className="app">
      <h1>React + TypeScript Checkpoint</h1>

      <section className="card">
        <h2>Code 01: Greeting</h2>
        {/* name must be a string, otherwise TypeScript shows an error */}
        <Greeting name="Chimaroke" />
      </section>

      <section className="card">
        <h2>Code 02: Counter</h2>
        <Counter />
      </section>
    </main>
  );
};

export default App;
