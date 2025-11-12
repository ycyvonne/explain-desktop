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
  onExplanationChange?: (explanation: string) => void;
  onAskFollowup?: () => void;
};

const ExplainComponent: React.FC<ExplainComponentProps> = ({ image, text, onExplanationChange, onAskFollowup }) => {
  const [level, setLevel] = useState<number>(2); // Default to high school (middle option)
  const [explanation, setExplanation] = useState<string>('');
  const [loading, setLoading] = useState(false);

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
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const errorMessage = `Failed to generate explanation: ${message}`;
      setExplanation(errorMessage);
      onExplanationChange?.(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [image, text, level, loading, onExplanationChange]);

  // Auto-trigger explain when text is selected (via cmd+shift+c)
  useEffect(() => {
    if ((text || image) && !loading && !explanation) {
      // Small delay to ensure component is fully mounted
      const timer = setTimeout(() => {
        handleExplain();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [text, image, loading, explanation, handleExplain]);

  useEffect(() => {
    if ((text || image) && !loading) {
      handleExplain();
    }
  }, [level]);

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

