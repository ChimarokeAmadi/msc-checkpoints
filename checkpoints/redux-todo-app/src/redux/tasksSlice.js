import { createSlice, nanoid } from '@reduxjs/toolkit';

// Every task has: id, description, isDone
const initialState = {
  tasks: [
    { id: nanoid(), description: 'Learn how Redux works', isDone: true },
    { id: nanoid(), description: 'Build the Redux to-do checkpoint', isDone: false },
    { id: nanoid(), description: 'Submit the checkpoint before the deadline', isDone: false },
  ],
  filter: 'all', // 'all' | 'done' | 'notDone'
};

// createSlice generates the reducer and the action creators together.
// Inside these reducers we can "mutate" state directly: Redux Toolkit uses
// Immer, which turns these changes into a new, immutable state.
const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    // Add a new task. `prepare` builds the full task object from just the description.
    addTask: {
      reducer(state, action) {
        state.tasks.push(action.payload);
      },
      prepare(description) {
        return { payload: { id: nanoid(), description, isDone: false } };
      },
    },

    // Switch a task between done and not done. payload: id
    toggleTask(state, action) {
      const task = state.tasks.find((t) => t.id === action.payload);
      if (task) task.isDone = !task.isDone;
    },

    // Change a task's description. payload: { id, description }
    editTask(state, action) {
      const task = state.tasks.find((t) => t.id === action.payload.id);
      if (task) task.description = action.payload.description;
    },

    // Remove a task. payload: id
    deleteTask(state, action) {
      state.tasks = state.tasks.filter((t) => t.id !== action.payload);
    },

    // Choose which tasks are shown. payload: 'all' | 'done' | 'notDone'
    setFilter(state, action) {
      state.filter = action.payload;
    },
  },
});

export const { addTask, toggleTask, editTask, deleteTask, setFilter } = tasksSlice.actions;

// Selectors: small functions that read data from the store
export const selectFilter = (state) => state.tasks.filter;
export const selectAllTasks = (state) => state.tasks.tasks;

export default tasksSlice.reducer;
