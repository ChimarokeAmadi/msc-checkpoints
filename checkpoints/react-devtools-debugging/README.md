# Debugging a React App with React Developer Tools

For this checkpoint I made a small Task Tracker app in React and used the React Developer Tools to find and fix the bugs in it. The app has several components that pass props to each other: `App` holds the tasks and the current filter in state, `Header` shows the title, `AddTaskForm` adds tasks, `FilterBar` switches between all, active and done tasks, `TaskList` and `TaskItem` show each task (with a star that each item keeps in its own state), and `Stats` counts the completed tasks.

I kept both versions of the app so the before and after can be compared. The buggy one is in `src/buggy` and the fixed one is in `src/fixed`. The components that didn't have any bugs are shared between them in `src/shared`. The full write-up of how I found and fixed each bug is in [DEBUGGING.md](DEBUGGING.md).

## How to run it

```bash
npm install
npm run dev
```

Then open the link it prints (usually http://localhost:5173). That page is the fixed app. The buggy one is at http://localhost:5173/buggy.html, and the banner at the top of each page links to the other one.

To inspect them, install the React Developer Tools extension in your browser, open DevTools, and go to the **⚛️ Components** tab.

## The bugs I fixed

1. **Missing title:** `Header` read a prop called `heading`, but the prop being passed was `title`.
2. **Crash when ticking a task:** the `onToggle` function was never passed down from `App`, so `TaskItem` got `undefined`.
3. **New tasks not appearing:** `addTask` used `push` on the state array, so React didn't see a change and didn't re-render.
4. **Wrong completed count:** `Stats` used `=` instead of checking the value, which set every task to done.
5. **Star jumping to the wrong task:** the list used the array index as the key, so state moved to another task after a delete.
