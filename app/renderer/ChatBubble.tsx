import React, { useCallback, useEffect, useRef, useState } from 'react';
import askLLM from './llm';

type Role = 'user' | 'assistant';

type Message = {
  role: Role;
  content: string;
};

const ChatBubble: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (dataUrl: string) => {
      setImage(dataUrl);
      setMessages([]);
      setInput('Explain this.');
    };

    window.overlayAPI?.onScreenshot(handler);

    return () => {
      // No-op cleanup because preload removes listeners before re-registering
    };
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
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

  const send = useCallback(async () => {
    if (!image || !input.trim() || loading) {
      return;
    }

    const question = input.trim();
    const history = [...messages, { role: 'user' as Role, content: question }];

    setInput('');
    setMessages(history);
    setLoading(true);

    try {
      const answer = await askLLM({
        question,
        screenshotDataUrl: image,
        history: messages,
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
  }, [image, input, loading, messages]);

  const onSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      void send();
    },
    [send],
  );

  return (
    <div className="chat-bubble">
      <div className="chat-header">
        <div className="chat-title">In-Context Explain</div>
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

      <div ref={scrollRef} className="chat-messages">
        {messages.map((message, index) => (
          <div key={index} className={`chat-message chat-${message.role}`}>
            <span className="chat-label">{message.role === 'user' ? 'You' : 'AI'}:</span>
            <span className="chat-content">{message.content}</span>
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
    </div>
  );
};

export default ChatBubble;
