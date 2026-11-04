// Code 02 converted to TypeScript
//
// Steps I followed:
// 1. Renamed the file from Counter.jsx to Counter.tsx.
// 2. Wrote a type for the state (CounterState): count is a number.
// 3. Wrote a type for the props (CounterProps). Counter doesn't take any
//    props, so it's just an empty object type.
// 4. Passed both types to Component: Component<CounterProps, CounterState>.
//    The first slot is for props, the second for state. Now this.props and
//    this.state are both typed, and this.setState only accepts valid state.
// 5. Gave the state property the CounterState type too.
// 6. Changed the import to only bring in Component (React itself isn't
//    needed for JSX anymore, same reason as in Greeting.tsx).
// 7. Fixed a bug from the original: "return" was alone on its line, so
//    JavaScript ended the statement there and render() returned nothing.
//    The opening "(" now sits on the same line as "return".

import { Component } from 'react';

// Counter has no props
type CounterProps = object;

// What the component keeps in its state
type CounterState = {
  count: number;
};

class Counter extends Component<CounterProps, CounterState> {
  // Initial state. Because of the CounterState type, writing
  // { count: 'zero' } or forgetting count would be an error.
  state: CounterState = {
    count: 0,
  };

  // Arrow function so "this" still points to the component when the
  // button calls it. It returns nothing, which is written as ": void".
  increment = (): void => {
    // TypeScript checks this object against CounterState, so a typo like
    // { cont: 1 } or a string value would not compile.
    this.setState({ count: this.state.count + 1 });
  };

  render() {
    return (
      <div>
        <p>Count: {this.state.count}</p>
        <button onClick={this.increment}>Increment</button>
      </div>
    );
  }
}

export default Counter;
