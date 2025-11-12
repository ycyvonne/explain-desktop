import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import askLLM from './llm';
import { normalizeMd } from './utils';
import ExplainComponent from './ExplainComponent';

type Role = 'user' | 'assistant';

type Message = {
  role: Role;
  content: string;
};

type Tab = 'explain' | 'chat';

const ExplainWindow: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('explain');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<Message[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        window.overlayAPI?.hide();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  type SendOptions = {
    question?: string;
    image?: string;
    text?: string;
    history?: Message[];
    resetInput?: boolean;
  };

  const send = useCallback(
    async (options: SendOptions = {}) => {
      if (loading) {
        return;
      }

      const activeImage = options.image ?? image;
      const activeText = options.text ?? selectedText;
      const activeQuestionRaw = options.question ?? input;
      const activeQuestion = activeQuestionRaw.trim();
      const historyBase = options.history ?? messagesRef.current;

      if ((!activeImage && !activeText) || !activeQuestion) {
        return;
      }

      if (options.resetInput ?? options.question === undefined) {
        setInput('');
      }

      const userMessage: Message = { role: 'user', content: activeQuestion };

      setMessages([...historyBase, userMessage]);
      setLoading(true);

      try {
        const answer = await askLLM({
          question: activeQuestion,
          screenshotDataUrl: activeImage || undefined,
          text: activeText || undefined,
          history: historyBase,
        });

        setMessages((prev) => [...prev, { role: 'assistant', content: answer }]);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `Failed to reach assistant: ${message}` },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [image, selectedText, input, loading],
  );

  const onSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      void send();
    },
    [send],
  );

  useEffect(() => {
    const screenshotHandler = ({ dataUrl, isExplain: isExplainMode = false }: ScreenshotPayload) => {
      setImage(dataUrl);
      setSelectedText(null);
      setMessages([]);
      setExplanation('');
      // Set initial tab based on isExplain, but user can switch
      setActiveTab(isExplainMode ? 'explain' : 'chat');

      if (!isExplainMode) {
        // Use multiple requestAnimationFrame calls and a small timeout to ensure
        // the window is fully focused and ready before focusing the input
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTimeout(() => {
              inputRef.current?.focus();
            }, 100);
          });
        });
      }
    };

    const textSelectionHandler = ({ text, isExplain: isExplainMode = true }: TextSelectionPayload) => {
      setSelectedText(text);
      setImage(null);
      setMessages([]);
      setExplanation('');
      setActiveTab(isExplainMode ? 'explain' : 'chat');

      if (!isExplainMode) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTimeout(() => {
              inputRef.current?.focus();
            }, 100);
          });
        });
      }
    };

    window.overlayAPI?.onScreenshot(screenshotHandler);
    window.overlayAPI?.onTextSelection(textSelectionHandler);

    return () => {
      // No-op cleanup because preload removes listeners before re-registering
    };
  }, []);

  useEffect(() => {
    const handleOverlayHide = () => {
      setInput('');
    };

    window.overlayAPI?.onHide(handleOverlayHide);
  }, [setInput]);

  // Focus input when switching to chat tab
  useEffect(() => {
    if (activeTab === 'chat' && (image || selectedText)) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [activeTab, image, selectedText]);

  return (
    <div className="chat-bubble">
      <div className="chat-header">
        {(image || selectedText) && (
          <div className="tab-container">
            <button
              className={`tab-button ${activeTab === 'explain' ? 'active' : ''}`}
              onClick={() => setActiveTab('explain')}
              type="button"
            >
              Explain
            </button>
            <button
              className={`tab-button ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
              type="button"
            >
              Chat
            </button>
          </div>
        )}
        {!image && !selectedText && (
          <div className="chat-title">In-Context Explain</div>
        )}
        <div className="chat-hint">Press Esc to hide</div>
        <button className="chat-close" type="button" onClick={() => window.overlayAPI?.hide()}>
          ✕
        </button>
      </div>

      {image && (
        <div className="chat-preview">
          <img src={image} alt="Screenshot preview" />
        </div>
      )}

      {selectedText && (
        <div className="chat-preview" style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px', margin: '8px', maxHeight: '150px', overflow: 'auto' }}>
          <div style={{ fontSize: '13px', color: '#666', whiteSpace: 'pre-wrap' }}>{selectedText}</div>
        </div>
      )}

      {(image || selectedText) && (
        <>
          <div className={`tab-content ${activeTab === 'explain' ? 'active' : 'hidden'}`}>
            <ExplainComponent 
              image={image} 
              text={selectedText}
              onExplanationChange={setExplanation}
              onAskFollowup={() => setActiveTab('chat')}
            />
          </div>
          <div className={`tab-content ${activeTab === 'chat' ? 'active' : 'hidden'}`}>
            {explanation && (
              <div className="chat-preview" style={{ padding: '12px', backgroundColor: 'rgba(28, 28, 28, 0.95)', borderRadius: '8px', marginBottom: '12px', border: '1px solid rgba(120, 120, 120, 0.4)', maxHeight: '50px', overflow: 'auto' }}>
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
                onChange={(event) => setInput(event.target.value)}
              />
              <button className="chat-send" disabled={(!image && !selectedText) || loading} type="submit">
                {loading ? 'Sending…' : 'Send'}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default ExplainWindow;

