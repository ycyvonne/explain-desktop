import { useCallback, RefObject } from 'react';
import askLLM from '../services/llm';
import { Message } from './useExplainWindowState';

type SendOptions = {
  question?: string;
  image?: string;
  text?: string;
  history?: Message[];
  resetInput?: boolean;
};

export function useChatSend(
  image: string | null,
  selectedText: string | null,
  input: string,
  loading: boolean,
  showExplanationContext: boolean,
  explanation: string,
  setInput: (value: string) => void,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  setLoading: (loading: boolean) => void,
  messagesRef: RefObject<Message[]>
) {
  const send = useCallback(
    async (options: SendOptions = {}) => {
      if (loading) {
        return;
      }

      const activeImage = options.image ?? image;
      const activeText = options.text ?? selectedText;
      const activeQuestionRaw = options.question ?? input;
      const activeQuestion = activeQuestionRaw.trim();
      const historyBase = options.history ?? (messagesRef.current || []);

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
        // Include explanation in history if it's shown in context
        let historyWithExplanation = historyBase;
        if (showExplanationContext && explanation) {
          // Prepend the explanation as an assistant message to provide context
          historyWithExplanation = [
            { role: 'assistant', content: explanation },
            ...historyBase,
          ];
        }

        const answer = await askLLM({
          question: activeQuestion,
          screenshotDataUrl: activeImage || undefined,
          text: activeText || undefined,
          history: historyWithExplanation,
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
    [image, selectedText, input, loading, showExplanationContext, explanation, setInput, setMessages, setLoading, messagesRef],
  );

  const onSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      void send();
    },
    [send],
  );

  return { send, onSubmit };
}

