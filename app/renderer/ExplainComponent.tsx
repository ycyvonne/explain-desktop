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
  image: string;
};

const ExplainComponent: React.FC<ExplainComponentProps> = ({ image }) => {
  const [level, setLevel] = useState<number>(2); // Default to high school (middle option)
  const [explanation, setExplanation] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const hasAutoExplainedRef = useRef<string | null>(null);

  // Clear explanation when image changes
  useEffect(() => {
    setExplanation('');
    setLoading(false);
    hasAutoExplainedRef.current = null;
  }, [image]);

  const handleExplain = useCallback(async () => {
    if (loading) {
      return;
    }

    setLoading(true);
    try {
      const levelText = EXPLANATION_LEVELS[level];
      const question = `Explain this like I'm ${levelText}`;
      
      const answer = await askLLM({
        question,
        screenshotDataUrl: image,
        history: [],
      });

      setExplanation(answer);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setExplanation(`Failed to generate explanation: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [image, level, loading]);

  // Auto-explain when component mounts or image changes
  useEffect(() => {
    if (image && !loading && hasAutoExplainedRef.current !== image) {
      hasAutoExplainedRef.current = image;
      void handleExplain();
    }
  }, [image, handleExplain, loading]);

  return (
    <>
      {image && (
        <div className="chat-preview">
          <img src={image} alt="Screenshot preview" />
        </div>
      )}

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
          disabled={loading || !image}
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

