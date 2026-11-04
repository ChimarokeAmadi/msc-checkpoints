# Debugging the Task Tracker with React Developer Tools

This is the record of how I debugged the sample app. The original buggy code is in `src/buggy` (open `/buggy.html`), and the fixed code is in `src/fixed` (open `/`). Every bug is marked with a `BUG #n` comment in the buggy files and a matching `FIX #n` comment in the fixed ones.

## Setting up React Developer Tools

I installed the **React Developer Tools** extension from the Chrome Web Store (it's also available for Firefox and Edge). After installing it, I started the app with `npm run dev`, opened it in Chrome, and opened the browser DevTools with `Cmd + Option + I` (`F12` on Windows). That adds two new tabs: **⚛️ Components** and **⚛️ Profiler**. If they don't show up, closing and reopening DevTools or refreshing the page usually fixes it.

There's also a standalone version for browsers without the extension. You run `npx react-devtools` and add the `<script src="http://localhost:8097"></script>` tag it gives you to `index.html`. I used the extension, but it works the same way.

In the Components tab I could see the whole component tree: `App` at the top, then `Banner`, `Header`, `AddTaskForm`, `FilterBar`, `TaskList` (with a `TaskItem` for each task) and `Stats`. Clicking a component shows its **props**, its **hooks** (state) and which component **rendered** it on the right side. I also turned on **Highlight updates when components render** in the settings (the gear icon), so components flash when they re-render.

## Bug 1: The title is missing

**What I saw:** the purple heading at the top of the app was empty. Only the small "Keep track of what you need to do" line was showing.

**How I found it:** I clicked `Header` in the Components tree. In the props panel it had `title: "My Task Tracker"`, so `App` was passing the title correctly and the problem had to be inside `Header` itself. I clicked the `<>` (view source) button in the top right of the panel, which opens the component's code. `Header` was destructuring `{ heading }`, but the prop is called `title`, so `heading` was `undefined`.

**Fix:** changed `({ heading })` to `({ title })` and used `{title}` in the `<h1>`. After saving, the heading showed "My Task Tracker".

## Bug 2: Clicking a checkbox breaks the whole app

**What I saw:** clicking any checkbox made the entire page go blank except the red banner. The browser console showed `TypeError: onToggle is not a function`, coming from `TaskItem`.

**How I found it:** I refreshed the page and selected one of the `TaskItem` components. Its props only listed `task` and `onDelete`; `onToggle` wasn't there at all. In the "rendered by" section I clicked up to `TaskList`, and its props were also only `tasks` and `onDelete`. So the function was missing from the very start, in `App`. Looking at `App.jsx`, the `toggleTask` function existed but was never passed to `<TaskList>`. The linter (`npm run lint`) even warns that `toggleTask` is declared but never used, which was another clue.

**Fix:** added `onToggle={toggleTask}` to `<TaskList>`. After that, `onToggle` appeared in the props of `TaskList` and every `TaskItem`, and the checkboxes worked.

## Bug 3: Added tasks don't appear

**What I saw:** typing a task and clicking Add cleared the input, but the new task didn't show up in the list. Then, when I clicked one of the filter buttons, it suddenly appeared.

**How I found it:** with "Highlight updates" turned on, clicking Add only flashed `AddTaskForm` (because its input was cleared), but `App` and `TaskList` didn't flash at all, so they weren't re-rendering. When I selected `App` and looked at its hooks, the first `State` (the tasks) already had the new task in it, but `TaskList`'s `tasks` prop still had the old list. That meant the data had changed but React didn't know about it. In `addTask` I found `tasks.push(...)` followed by `setTasks(tasks)`. `push` changes the existing array instead of making a new one, and since `setTasks` got back the exact same array, React thought nothing had changed and skipped the re-render. The task only appeared later because something else (the filter) triggered a render.

**Fix:** made a new array instead of changing the old one: `setTasks((prev) => [...prev, newTask])`. I also changed the toggle and delete functions to the same `prev =>` style so they always work with the latest state. Now `App`, `TaskList` and `Stats` flash when a task is added, and it shows up straight away.

## Bug 4: Every task is counted as completed

**What I saw:** the counter at the bottom said "3 of 3 tasks completed" even though only one task was ticked. After clicking around a bit, every checkbox ended up ticked too.

**How I found it:** I selected `Stats` and expanded its `tasks` prop: every task had `done: true`. Then I selected the `TaskItem` for "Read about props and state", which was clearly unticked on the screen, and its `task` prop also said `done: true`. The screen and the data didn't match, which told me something was changing the tasks *during* rendering, after the `TaskItem`s had already been drawn. `Stats` renders last and uses the tasks, so I checked its code: `tasks.filter((t) => (t.done = true))`. It used a single `=`, which **sets** `done` to `true` on every task instead of checking it, and it changed the state objects directly.

**Fix:** changed it to `tasks.filter((t) => t.done)`, which only reads the value. Now `Stats` shows "1 of 3 tasks completed" at the start, and the `done` values in DevTools match the checkboxes.

## Bug 5: The star jumps to the wrong task

**What I saw:** I starred "Finish the debugging checkpoint" (the second task) and then deleted the first task. The star moved to "Read about props and state", a task I never starred.

**How I found it:** in the Components tree, React DevTools shows each component's key next to its name. The `TaskItem`s were `key="0"`, `key="1"` and `key="2"`, which meant the keys were the array indexes. Selecting `key="1"` showed its hook `State: true` (the star) and the task "Finish the debugging checkpoint". After deleting the first task, there were only `key="0"` and `key="1"` left, and `key="1"` still had `State: true`, but its `task` prop was now "Read about props and state". React keeps a component's state based on its key, so when the indexes shifted, the star stayed with key 1 even though key 1 now belonged to a different task.

**Fix:** in `TaskList`, changed `key={index}` to `key={task.id}`. Now the keys in DevTools are `key="1"`, `key="2"`, `key="3"`, they stay the same after a delete, and the star stays on the task I actually starred.

## Checking that everything works

After the fixes I went through the app again, and I also checked it in DevTools:

- The heading shows "My Task Tracker".
- Ticking a checkbox crosses the task out, updates the counter, and the app no longer crashes.
- New tasks show up immediately, and `App` re-renders when one is added.
- The counter is correct ("1 of 3 tasks completed" at the start), and the `done` values in DevTools match the checkboxes.
- Stars stay on the right task after deleting other tasks, and the keys in the tree are the task ids.
- The All / Active / Done filters show the right tasks.
- There are no errors in the console, and `npx oxlint src/fixed` has no warnings (the only warning left in the project is the unused `toggleTask` in the buggy version, which I kept as it was).

I also recorded a session in the **Profiler** tab while adding a task. In the buggy version, `App` didn't appear in the commit at all. In the fixed version, the commit shows `App`, `TaskList` and `Stats` re-rendering, which confirms the state update is now working.

## What I learned

Most of these bugs didn't show any error message. The app just behaved strangely, so reading the code alone would have taken longer. Being able to click on a component and see its real props, state and key made it much quicker to tell whether the problem came from the parent (Bug 2), from the component itself (Bug 1), or from the way the state was being changed (Bugs 3 and 4). The two rules I'll remember: never change state or props directly, always make a new copy, and use a stable id as the key instead of the index.
