import { useState, useEffect } from 'react';

export function usePersistentState(key, initialValue) {
  const [state, setState] = useState(() => {
    try {
      const storedValue = window.localStorage.getItem(key);
      
      // --- FIX IS HERE ---
      // Check if the stored value exists and is not the string "undefined"
      if (storedValue && storedValue !== "undefined") {
        return JSON.parse(storedValue);
      }
      // Otherwise, return the initial value
      return initialValue;

    } catch (error) {
      console.error("Error reading from localStorage", error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error("Error writing to localStorage", error);
    }
  }, [key, state]);

  return [state, setState];
}