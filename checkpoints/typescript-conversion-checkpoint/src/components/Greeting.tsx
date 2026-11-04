// Code 01 converted to TypeScript
//
// Steps I followed:
// 1. Renamed the file from Greeting.jsx to Greeting.tsx.
//    ".tsx" tells TypeScript the file is TypeScript AND contains JSX.
// 2. Described the props with a type (GreetingProps), so TypeScript knows
//    the component expects a "name" and that it must be a string.
// 3. Used that type on the destructured props: ({ name }: GreetingProps).
// 4. Removed "import React from 'react'". With the modern JSX transform
//    (the "jsx": "react-jsx" setting in tsconfig) React doesn't need to be
//    imported just to write JSX, and an unused import would be an error here
//    because "noUnusedLocals" is turned on.

// The shape of the props this component accepts
type GreetingProps = {
  name: string; // required, and must be text
};

// The function takes GreetingProps and returns JSX.
// TypeScript works out the return type by itself, so I didn't write it.
const Greeting = ({ name }: GreetingProps) => {
  return <div>Hello, {name}!</div>;
};

export default Greeting;

// What TypeScript now catches for us:
//   <Greeting />             -> error: property 'name' is missing
//   <Greeting name={42} />   -> error: number is not assignable to string
