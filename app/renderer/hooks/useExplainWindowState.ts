import { useState, useRef, useEffect } from 'react';
import { useCache } from './useCache';

export type Role = 'user' | 'assistant';

export type Message = {
  role: Role;
  content: string;
};

export type Tab = 'explain' | 'chat' | 'settings';

export function useExplainWindowState() {
  const [image, setImage] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('explain');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<string>('');
  const [showExplanationContext, setShowExplanationContext] = useState(false);
  const [explainKey, setExplainKey] = useState(0);
  const [explainLevel, setExplainLevel] = useState<number>(2); // Default to high school (middle option)
  const explainCache = useCache<string, string>();
  const messagesRef = useRef<Message[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  return {
    image,
    setImage,
    selectedText,
    setSelectedText,
    activeTab,
    setActiveTab,
    messages,
    setMessages,
    input,
    setInput,
    loading,
    setLoading,
    explanation,
    setExplanation,
    showExplanationContext,
    setShowExplanationContext,
    explainKey,
    setExplainKey,
    explainLevel,
    setExplainLevel,
    explainCache,
    messagesRef,
  };
}

