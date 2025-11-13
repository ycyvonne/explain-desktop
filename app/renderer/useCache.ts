import { useRef } from 'react';

/**
 * Custom hook for managing a cache Map that persists across renders.
 * The cache is stored in a ref so it doesn't cause re-renders when updated.
 */
export function useCache<K, V>(): {
  get: (key: K) => V | undefined;
  set: (key: K, value: V) => void;
  clear: () => void;
  has: (key: K) => boolean;
} {
  const cacheRef = useRef<Map<K, V>>(new Map());

  return {
    get: (key: K) => cacheRef.current.get(key),
    set: (key: K, value: V) => {
      cacheRef.current.set(key, value);
    },
    clear: () => {
      cacheRef.current.clear();
    },
    has: (key: K) => cacheRef.current.has(key),
  };
}

