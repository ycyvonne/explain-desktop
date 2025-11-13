import React from 'react';
import ReactMarkdown from 'react-markdown';
import 'katex/dist/katex.min.css';
import { normalizeMd } from '../utils/utils';
import { useExplanation, type ExplainCache } from '../hooks/useExplanation';
import { MARKDOWN_REHYPE_PLUGINS, MARKDOWN_REMARK_PLUGINS } from '../utils/markdownConfig';

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
  level?: number;
  onLevelChange?: (level: number) => void;
  onExplanationChange?: (explanation: string) => void;
  cache?: ExplainCache;
  onAskFollowup?: () => void;
};

const ExplainComponent: React.FC<ExplainComponentProps> = ({ image, text, level = 2, onLevelChange, onExplanationChange, cache, onAskFollowup }) => {
  const { explanation, loading } = useExplanation({
    image,
    text,
    level,
    cache,
    onExplanationChange,
    autoTrigger: true,
  });

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
                  <ReactMarkdown remarkPlugins={MARKDOWN_REMARK_PLUGINS} rehypePlugins={MARKDOWN_REHYPE_PLUGINS}>
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

