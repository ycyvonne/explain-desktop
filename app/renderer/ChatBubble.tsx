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

const ChatBubble: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [isExplain, setIsExplain] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<Message[]>([]);
  const shouldFocusAfterLoadRef = useRef<boolean>(false);

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
    history?: Message[];
    resetInput?: boolean;
  };

  const send = useCallback(
    async (options: SendOptions = {}) => {
      if (loading) {
        return;
      }

      const activeImage = options.image ?? image;
      const activeQuestionRaw = options.question ?? input;
      const activeQuestion = activeQuestionRaw.trim();
      const historyBase = options.history ?? messagesRef.current;

      if (!activeImage || !activeQuestion) {
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
          screenshotDataUrl: activeImage,
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
    [image, input, loading],
  );

  useEffect(() => {
    // Focus input after loading completes if it was triggered by isExplain
    if (!loading && shouldFocusAfterLoadRef.current) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
      shouldFocusAfterLoadRef.current = false;
    }
  }, [loading]);

  const onSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      void send();
    },
    [send],
  );

  useEffect(() => {
    const handler = ({ dataUrl, isExplain: isExplainMode = false }: ScreenshotPayload) => {
      setImage(dataUrl);
      setIsExplain(isExplainMode);
      setMessages([]);

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

    window.overlayAPI?.onScreenshot(handler);

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

  return (
    <div className="chat-bubble">
      <div className="chat-header">
        <div className="chat-title">In-Context Explain</div>
        <div className="chat-hint">Press Esc to hide</div>
        <button className="chat-close" type="button" onClick={() => window.overlayAPI?.hide()}>
          ✕
        </button>
      </div>

      {isExplain && image ? (
        <ExplainComponent image={image} />
      ) : (
        <>
          {image && (
            <div className="chat-preview">
              <img src={image} alt="Screenshot preview" />
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
              placeholder={image ? 'Ask about the screenshot…' : 'Capture a screenshot first'}
              disabled={!image || loading}
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            <button className="chat-send" disabled={!image || loading} type="submit">
              {loading ? 'Sending…' : 'Send'}
            </button>
          </form>
        </>
      )}
    </div>
  );
};

export default ChatBubble;
