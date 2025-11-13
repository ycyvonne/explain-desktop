import React, { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { normalizeMd } from '../utils/utils';
import { Message } from '../hooks/useExplainWindowState';
import { useFocusInputImmediate } from '../hooks/useFocusInput';
import { MARKDOWN_REHYPE_PLUGINS, MARKDOWN_REMARK_PLUGINS } from '../utils/markdownConfig';

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
        <div className="chat-preview explain-context-preview">
          <button
            type="button"
            onClick={onCloseExplanationContext}
            className="explain-context-close"
            title="Close context"
          >
            ✕
          </button>
          <div className="explain-context-scroll">
            <div className="chat-content chat-content-markdown explain-context-text">
              <div className="md">
                <ReactMarkdown remarkPlugins={MARKDOWN_REMARK_PLUGINS} rehypePlugins={MARKDOWN_REHYPE_PLUGINS}>
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
                  remarkPlugins={MARKDOWN_REMARK_PLUGINS}
                  rehypePlugins={MARKDOWN_REHYPE_PLUGINS}
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

