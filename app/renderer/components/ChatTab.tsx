import React, { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { normalizeMd } from '../utils/utils';
import { Message } from '../hooks/useExplainWindowState';
import { useFocusInputImmediate } from '../hooks/useFocusInput';

type ChatTabProps = {
  messages: Message[];
  loading: boolean;
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  image: string | null;
  selectedText: string | null;
  showExplanationContext: boolean;
  explanation: string;
  onCloseExplanationContext: () => void;
  activeTab: string;
};

const ChatTab: React.FC<ChatTabProps> = ({
  messages,
  loading,
  input,
  onInputChange,
  onSubmit,
  image,
  selectedText,
  showExplanationContext,
  explanation,
  onCloseExplanationContext,
  activeTab,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when switching to chat tab
  useFocusInputImmediate(inputRef, activeTab === 'chat' && (image !== null || selectedText !== null));

  // Auto-scroll chat to bottom only when user sends a message
  useEffect(() => {
    if (activeTab === 'chat' && scrollRef.current && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      // Only scroll if the last message is from the user
      if (lastMessage.role === 'user') {
        // Use requestAnimationFrame to ensure DOM has updated
        requestAnimationFrame(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        });
      }
    }
  }, [messages, activeTab]);

  return (
    <div className={`tab-content ${activeTab === 'chat' ? 'active' : 'hidden'}`}>
      {showExplanationContext && explanation && (
        <div className="chat-preview" style={{ padding: '12px', backgroundColor: 'rgba(28, 28, 28, 0.95)', borderRadius: '8px', marginBottom: '12px', border: '1px solid rgba(120, 120, 120, 0.4)', maxHeight: '50px', position: 'relative' }}>
          <button
            type="button"
            onClick={onCloseExplanationContext}
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.6)',
              cursor: 'pointer',
              padding: '4px',
              zIndex: 10,
              fontSize: '12px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.95)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
            }}
            title="Close context"
          >
            ✕
          </button>
          <div style={{ maxHeight: '50px', overflow: 'auto', paddingRight: '24px' }}>
            <div className="chat-content chat-content-markdown" style={{ fontSize: '13px' }}>
              <div className="md">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {normalizeMd(explanation)}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      )}
      <div ref={scrollRef} className="chat-messages">
        {messages.map((message, index) => (
          <div key={index} className={`chat-message chat-${message.role}`}>
            <span className="chat-label">{message.role === 'user' ? 'You' : 'AI'}:</span>
            <div className="chat-content chat-content-markdown">
              <div className="md">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {normalizeMd(message.content)}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="chat-message chat-assistant">
            <span className="chat-label">AI:</span>
            <span className="chat-content">Thinking…</span>
          </div>
        )}
      </div>

      <form className="chat-form" onSubmit={onSubmit}>
        <input
          autoFocus
          ref={inputRef}
          className="chat-input"
          placeholder={image ? 'Ask about the screenshot…' : selectedText ? 'Ask about the selected text…' : 'Capture a screenshot first'}
          disabled={(!image && !selectedText) || loading}
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
        />
        <button className="chat-send" disabled={(!image && !selectedText) || loading} type="submit">
          {loading ? 'Sending…' : 'Send'}
        </button>
      </form>
    </div>
  );
};

export default ChatTab;

