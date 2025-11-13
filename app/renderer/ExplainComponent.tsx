import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import askLLM from './llm';
import { normalizeMd } from './utils';

const EXPLANATION_LEVELS = [
  'a 5 year old',
  'a middle schooler',
  'a high school student',
  'an undergraduate student',
  'an expert',
] as const;

const EXPLANATION_LABELS = [
  '5Yo',
  'middle schooler',
  'high school',
  'undergrad',
  'expert',
] as const;

type ExplainCache = {
  get: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  clear: () => void;
  has: (key: string) => boolean;
};

type ExplainComponentProps = {
  image?: string | null;
  text?: string | null;
  level?: number;
  onLevelChange?: (level: number) => void;
  onExplanationChange?: (explanation: string) => void;
  cache?: ExplainCache;
  onAskFollowup?: () => void;
};

const ExplainComponent: React.FC<ExplainComponentProps> = ({ image, text, level = 2, onLevelChange, onExplanationChange, cache, onAskFollowup }) => {
  const [explanation, setExplanation] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Generate cache key for current input and level
  const getCacheKey = useCallback(() => {
    if (image) {
      // For images, use a hash of the dataUrl (first 200 chars should be unique enough)
      const imageId = image.substring(0, 200);
      return `image-${imageId}-${level}`;
    }
    if (text) {
      // For text, use the text itself as the key
      return `text-${text}-${level}`;
    }
    return null;
  }, [image, text, level]);

  // Clear explanation when image or text changes
  useEffect(() => {
    setExplanation('');
    setLoading(false);
    onExplanationChange?.('');
  }, [image, text, onExplanationChange]);

  const handleExplain = useCallback(async () => {
    if (loading) {
      return;
    }

    if (!image && !text) {
      return;
    }

    // Check cache first
    const cacheKey = getCacheKey();
    if (cache && cacheKey) {
      const cached = cache.get(cacheKey);
      if (cached) {
        setExplanation(cached);
        onExplanationChange?.(cached);
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

      setExplanation(answer);
      onExplanationChange?.(answer);
      
      // Store in cache
      if (cache && cacheKey) {
        cache.set(cacheKey, answer);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const errorMessage = `Failed to generate explanation: ${message}`;
      setExplanation(errorMessage);
      onExplanationChange?.(errorMessage);
      
      // Don't cache errors
    } finally {
      setLoading(false);
    }
  }, [image, text, level, loading, onExplanationChange, cache, getCacheKey]);

  // Auto-trigger explain when text is selected (via cmd+shift+c)
  useEffect(() => {
    if ((text || image) && !loading && !explanation) {
      // Check cache first before auto-triggering
      const cacheKey = getCacheKey();
      if (cache && cacheKey) {
        const cached = cache.get(cacheKey);
        if (cached) {
          setExplanation(cached);
          onExplanationChange?.(cached);
          return;
        }
      }
      // Small delay to ensure component is fully mounted
      const timer = setTimeout(() => {
        handleExplain();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [text, image, loading, explanation, handleExplain, cache, getCacheKey, onExplanationChange]);

  // When level changes, check cache first, then call handleExplain if not cached
  useEffect(() => {
    if (!(text || image) || loading) return;
    
    const cacheKey = getCacheKey();
    if (cache && cacheKey) {
      const cached = cache.get(cacheKey);
      if (cached) {
        setExplanation(cached);
        onExplanationChange?.(cached);
        return;
      }
    }
    
    // Not in cache, fetch it
    handleExplain();
  }, [level, text, image, loading, cache, getCacheKey, onExplanationChange, handleExplain]);

  return (
    <>
      <div className="explain-controls">
        <div className="explain-slider-container">
          <input
            type="range"
            min="0"
            max="4"
            step="1"
            value={level}
            onChange={(e) => onLevelChange?.(Number(e.target.value))}
            className="explain-slider"
            disabled={loading}
            style={{
              '--slider-fill': `${(level / 4) * 100}%`,
            } as React.CSSProperties}
          />
          <div className="explain-slider-labels">
            {EXPLANATION_LABELS.map((label, index) => (
              <span
                key={index}
                className={`explain-slider-label ${index === level ? 'active' : ''}`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {(explanation || loading) && (
        <div className="explain-result">
          {loading ? (
            <div className="chat-content">Thinking…</div>
          ) : (
            <>
              <div className="chat-content chat-content-markdown">
                <div className="md">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                  >
                    {normalizeMd(explanation)}
                  </ReactMarkdown>
                </div>
              </div>
              {explanation && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(120, 120, 120, 0.3)' }}>
                  <button
                    type="button"
                    onClick={onAskFollowup}
                    className="followup-link"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'rgba(134, 197, 255, 0.95)',
                      cursor: 'pointer',
                      fontSize: '14px',
                      textDecoration: 'underline',
                      padding: 0,
                      font: 'inherit',
                    }}
                  >
                    Ask followup question
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
};

export default ExplainComponent;

