import { useState, useEffect, useCallback, useRef } from 'react';
import { toErrorMessage } from '../../errorUtils';
import askLLM from '../services/llm';

export type ExplainCache = {
  get: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  clear: () => void;
  has: (key: string) => boolean;
};

const EXPLANATION_LEVELS = [
  'a 5 year old',
  'a middle schooler',
  'a high school student',
  'an undergraduate student',
  'an expert',
] as const;

function hashString(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(index);
  }
  return hash.toString(16);
}

type UseExplanationOptions = {
  image?: string | null;
  text?: string | null;
  level?: number;
  cache?: ExplainCache;
  onExplanationChange?: (explanation: string) => void;
  autoTrigger?: boolean; // Whether to auto-trigger when content changes
};

/**
 * Custom hook to manage explanation state, caching, and fetching
 * Consolidates cache checking logic and simplifies component code
 */
export function useExplanation({
  image,
  text,
  level = 2,
  cache,
  onExplanationChange,
  autoTrigger = true,
}: UseExplanationOptions) {
  const [explanation, setExplanation] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const previousKeyRef = useRef<string | null>(null);

  // Generate cache key for current input and level
  const getCacheKey = useCallback((): string | null => {
    if (image) {
      return `image-${hashString(image)}-${level}`;
    }
    if (text) {
      return `text-${hashString(text)}-${level}`;
    }
    return null;
  }, [image, text, level]);

  // Helper to update explanation state and notify parent
  const updateExplanation = useCallback(
    (value: string) => {
      setExplanation(value);
      onExplanationChange?.(value);
    },
    [onExplanationChange]
  );

  // Check cache and return cached value if available
  const checkCache = useCallback((): string | null => {
    const cacheKey = getCacheKey();
    if (!cache || !cacheKey) {
      return null;
    }
    return cache.get(cacheKey) || null;
  }, [cache, getCacheKey]);

  // Fetch explanation from LLM
  const fetchExplanation = useCallback(async () => {
    if (loading || (!image && !text)) {
      return;
    }

    const cacheKey = getCacheKey();
    
    // Check cache first
    if (cache && cacheKey) {
      const cached = cache.get(cacheKey);
      if (cached) {
        updateExplanation(cached);
        return;
      }
    }

    setLoading(true);
    try {
      const levelText = EXPLANATION_LEVELS[level];
      const question = `Explain this like I'm ${levelText}`;

      const answer = await askLLM({
        question,
        screenshotDataUrl: image || undefined,
        text: text || undefined,
        history: [],
      });

      updateExplanation(answer);

      // Store in cache
      if (cache && cacheKey) {
        cache.set(cacheKey, answer);
      }
    } catch (error) {
      const errorMessage = `Failed to generate explanation: ${toErrorMessage(error)}`;
      updateExplanation(errorMessage);
      // Don't cache errors
    } finally {
      setLoading(false);
    }
  }, [image, text, level, loading, cache, getCacheKey, updateExplanation]);

  // Clear explanation when image or text changes (but not level)
  useEffect(() => {
    const currentKey = getCacheKey();
    if (currentKey !== previousKeyRef.current) {
      // Content changed (image/text), reset explanation
      if (previousKeyRef.current !== null) {
        updateExplanation('');
        setLoading(false);
      }
      previousKeyRef.current = currentKey;
    }
  }, [image, text, getCacheKey, updateExplanation]);

  // Auto-trigger or check cache when content/level changes
  useEffect(() => {
    if (!autoTrigger || !(text || image) || loading) {
      return;
    }

    const cacheKey = getCacheKey();
    if (!cacheKey) {
      return;
    }

    // Check cache first
    const cached = checkCache();
    if (cached) {
      updateExplanation(cached);
      return;
    }

    // Not in cache, fetch it with a small delay to ensure component is mounted
    const timer = setTimeout(() => {
      void fetchExplanation();
    }, 100);

    return () => clearTimeout(timer);
  }, [text, image, level, autoTrigger, loading, checkCache, updateExplanation, fetchExplanation]);

  return {
    explanation,
    loading,
    fetchExplanation,
  };
}

