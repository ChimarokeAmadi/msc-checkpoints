// ORIGINAL JavaScript version (Code 02), copied exactly as given, kept here
// only to compare with src/components/Counter.tsx. This folder is not part of the app.
//
// Note: there's a bug in the original. "return" is alone on its line, so
// JavaScript inserts a semicolon right after it and render() returns undefined.
// The TypeScript version fixes this.
import React, { Component } from 'react';
class Counter extends Component {
  state = {
    count: 0
  }; increment = () => {
    this.setState({ count: this.state.count + 1 });
  };
  render() {
    return
    ( <div>
      <p>Count: {this.state.count}</p>
      <button onClick={this.increment}>Increment</button>
    </div> );
  }
}
export default Counter;
