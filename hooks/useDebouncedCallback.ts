
import { useCallback, useEffect, useRef } from 'react';

/**
 * Creates a debounced version of a callback function that returns a Promise.
 * The debounced function will only be called after the specified delay has passed
 * without any new calls to the debounced function.
 *
 * @param callback The function to debounce, which must return a Promise.
 * @param delay The debounce delay in milliseconds.
 * @returns A memoized, debounced version of the callback function that returns a Promise.
 */
function useDebouncedCallback<A extends any[], R>(
  callback: (...args: A) => Promise<R>, // Callback now must return a Promise
  delay: number
): (...args: A) => Promise<R> { // The debounced function also returns a Promise
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<number | null>(null);

  // Update callbackRef.current if the callback prop changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup timeout on unmount of the component using this hook
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: A): Promise<R> => { // Ensure the returned function explicitly returns a Promise
      return new Promise<R>((resolve, reject) => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = window.setTimeout(() => {
          callbackRef.current(...args)
            .then(resolve)
            .catch(reject);
        }, delay);
      });
    },
    [delay] // timeoutRef and callbackRef are refs, their identity is stable
  );
}

export default useDebouncedCallback;
