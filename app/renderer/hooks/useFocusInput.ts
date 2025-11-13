import { useEffect, RefObject } from 'react';

/**
 * Custom hook to manage input focus with proper timing.
 * Uses nested requestAnimationFrame and timeout to ensure
 * the window is fully focused and ready before focusing the input.
 */
export function useFocusInput(
  inputRef: RefObject<HTMLInputElement>,
  shouldFocus: boolean,
  delay: number = 100
) {
  useEffect(() => {
    if (!shouldFocus || !inputRef.current) {
      return;
    }

    // Use multiple requestAnimationFrame calls and a small timeout to ensure
    // the window is fully focused and ready before focusing the input
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          inputRef.current?.focus();
        }, delay);
      });
    });
  }, [shouldFocus, inputRef, delay]);
}

/**
 * Simplified version for immediate focus (single requestAnimationFrame)
 */
export function useFocusInputImmediate(
  inputRef: RefObject<HTMLInputElement>,
  shouldFocus: boolean
) {
  useEffect(() => {
    if (!shouldFocus || !inputRef.current) {
      return;
    }

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [shouldFocus, inputRef]);
}

