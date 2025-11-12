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

type ExplainComponentProps = {
  image?: string | null;
  text?: string | null;
  autoExplain?: boolean;
};

const ExplainComponent: React.FC<ExplainComponentProps> = ({ image, text, autoExplain = false }) => {
  const [level, setLevel] = useState<number>(2); // Default to high school (middle option)
  const [explanation, setExplanation] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Auto-trigger explain when text is selected (via cmd+shift+c)
  const hasAutoExplainedRef = useRef<string | null>(null);

  // Clear explanation when image or text changes
  useEffect(() => {
    setExplanation('');
    setLoading(false);
    // Reset auto-explained ref when content changes
    hasAutoExplainedRef.current = null;
  }, [image, text]);

  const handleExplain = useCallback(async () => {
    if (loading) {
      return;
    }

    if (!image && !text) {
      return;
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
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setExplanation(`Failed to generate explanation: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [image, text, level, loading]);

  // Auto-trigger explain when text is selected (via cmd+shift+c)
  useEffect(() => {
    if (autoExplain && text && !image && !loading && !explanation && hasAutoExplainedRef.current !== text) {
      // Mark that we've auto-explained this text
      hasAutoExplainedRef.current = text;
      // Small delay to ensure component is fully mounted
      const timer = setTimeout(() => {
        handleExplain();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoExplain, text, image, loading, explanation, handleExplain]);

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
            onChange={(e) => setLevel(Number(e.target.value))}
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

        <button
          className="explain-button"
          onClick={handleExplain}
          disabled={loading || (!image && !text)}
          type="button"
        >
          {loading ? 'Explaining…' : 'Explain'}
        </button>
      </div>

      {(explanation || loading) && (
        <div className="explain-result">
          {loading && !explanation ? (
            <div className="chat-content">Thinking…</div>
          ) : (
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
          )}
        </div>
      )}
    </>
  );
};

export default ExplainComponent;

