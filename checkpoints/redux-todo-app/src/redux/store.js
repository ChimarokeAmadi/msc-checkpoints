import { configureStore } from '@reduxjs/toolkit';
import tasksReducer from './tasksSlice';

// The single global store for the whole app
const store = configureStore({
  reducer: {
    tasks: tasksReducer,
  },
});

export default store;
