import { useState, useEffect } from 'react';

/**
 * Works like useState, but the value is also saved to localStorage.
 * - On first load, it reads the saved value (or uses initialValue if nothing is saved).
 * - Whenever the value changes, it is written back to localStorage.
 */
function useLocalStorage(key, initialValue) {
  // Passing a function to useState means localStorage is only read once, on startup
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved !== null ? JSON.parse(saved) : initialValue;
    } catch {
      // Storage is blocked or the saved data is broken: start fresh
      return initialValue;
    }
  });

  // Save to localStorage every time the value changes
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage is full or blocked: the app still works, it just won't remember
    }
  }, [key, value]);

  return [value, setValue];
}

export default useLocalStorage;
