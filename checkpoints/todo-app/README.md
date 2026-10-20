# To-Do List App

This is a simple to-do list I built with React for the state management checkpoint. You can add tasks with a name and a description, edit them, mark them as done, and delete them. Everything is saved in the browser, so your tasks are still there when you close the tab and come back.

## How to run it

You need Node.js installed. Then, from this folder, run:

```bash
npm install
npm start
```

The app opens at http://localhost:3000. Press `Ctrl + C` in the terminal to stop it.

## What it does

To add a task, fill in the name and description at the top and click "Add task". Both fields are required, so if either one is empty you get a red message under it and the task isn't added. You can also pick a priority (high, medium or low) and an optional due date.

To edit a task, click on it (or on its Edit button). The task turns into a form already filled in with its details, and the same validation applies when you save. Cancel puts it back the way it was.

The checkbox on the left marks a task as completed. Completed tasks fade out, turn green and have their name crossed out, so they're easy to tell apart from active ones. Active tasks get a coloured stripe on the left for their priority: red for high, orange for medium and blue for low.

Clicking Delete opens a small pop-up asking you to confirm, so you can't remove a task by accident. You can cancel with the Cancel button, the Escape key, or by clicking outside the pop-up.

For the optional part, I added filters to show all, active or completed tasks, and a sort menu to order them by newest, priority or due date. If a task's due date has passed and it isn't done yet, the date shows in red as overdue.

## How it's organised

The tasks live in `App.js`, which passes them down to the other components along with the functions that change them.

- `TaskForm` is the form for both adding and editing, and it does the validation.
- `TaskList` shows the list, or a message when there's nothing to show.
- `TaskItem` is a single task with its checkbox, edit and delete buttons.
- `TaskFilters` has the filter buttons and the sort menu.
- `ConfirmDialog` is the delete confirmation pop-up.

Saving is handled by a small custom hook in `hooks/useLocalStorage.js`. It works like `useState`, but it loads the tasks from localStorage when the app starts and saves them again every time they change.

## Things to know

Tasks are saved in localStorage, which belongs to one browser on one computer. They won't show up in a different browser or on another device, and clearing your browser data deletes them. If the saved data ever gets corrupted, the app starts with an empty list instead of crashing.
