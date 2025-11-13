import React, { useEffect } from 'react';
import SettingsComponent from './SettingsComponent';
import { useExplainWindowState } from '../hooks/useExplainWindowState';
import { useChatSend } from '../hooks/useChatSend';
import TabNavigation from './TabNavigation';
import ContentPreview from './ContentPreview';
import ExplainTab from './ExplainTab';
import ChatTab from './ChatTab';

const ExplainWindow: React.FC = () => {
  const state = useExplainWindowState();
  const {
    image,
    selectedText,
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
  } = state;

  // Handle Escape key
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        window.overlayAPI?.hide();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Setup overlay handlers
  useEffect(() => {
    const screenshotHandler = ({ dataUrl, isExplain: isExplainMode = false }: ScreenshotPayload) => {
      state.setImage(dataUrl);
      state.setSelectedText(null);
      state.setMessages([]);
      state.setExplanation('');
      state.setShowExplanationContext(false);
      // Clear cache for previous input when new input arrives
      explainCache.clear();
      setExplainKey((prev) => prev + 1);
      // Set initial tab based on isExplain, but user can switch
      // Only set to explain/chat if we have content, otherwise keep current tab
      if (dataUrl) {
        setActiveTab(isExplainMode ? 'explain' : 'chat');
      }
    };

    const textSelectionHandler = ({ text, isExplain: isExplainMode = true }: TextSelectionPayload) => {
      state.setSelectedText(text);
      state.setImage(null);
      state.setMessages([]);
      state.setExplanation('');
      state.setShowExplanationContext(false);
      // Clear cache for previous input when new input arrives
      explainCache.clear();
      setExplainKey((prev) => prev + 1);
      // Only set to explain/chat if we have content, otherwise keep current tab
      if (text) {
        setActiveTab(isExplainMode ? 'explain' : 'chat');
      }
      // Note: Focus is handled by ChatTab component when tab becomes active
    };

    window.overlayAPI?.onScreenshot(screenshotHandler);
    window.overlayAPI?.onTextSelection(textSelectionHandler);

    return () => {
      // No-op cleanup because preload removes listeners before re-registering
    };
  }, [state, explainCache, setExplainKey, setActiveTab]);

  useEffect(() => {
    const handleOverlayHide = () => {
      setInput('');
    };

    window.overlayAPI?.onHide(handleOverlayHide);
  }, [setInput]);

  const { onSubmit } = useChatSend(
    image,
    selectedText,
    input,
    loading,
    showExplanationContext,
    explanation,
    setInput,
    setMessages,
    setLoading,
    messagesRef
  );

  const hasContent = image !== null || selectedText !== null;

  return (
    <div className="chat-bubble">
      <div className="chat-header">
        <TabNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          hasContent={hasContent}
        />
        {!hasContent && (
          <div className="chat-title">In-Context Explain</div>
        )}
        <div className="chat-hint">Press Esc to hide</div>
        <button className="chat-close" type="button" onClick={() => window.overlayAPI?.hide()}>
          ✕
        </button>
      </div>

      <ContentPreview image={image} selectedText={selectedText} activeTab={activeTab} />

      {hasContent && (
        <>
          <ExplainTab
            activeTab={activeTab}
            image={image}
            selectedText={selectedText}
            explainKey={explainKey}
            explainLevel={explainLevel}
            onLevelChange={setExplainLevel}
            onExplanationChange={setExplanation}
            cache={explainCache}
            onAskFollowup={() => {
              setShowExplanationContext(true);
              setActiveTab('chat');
            }}
          />
          <ChatTab
            messages={messages}
            loading={loading}
            input={input}
            onInputChange={setInput}
            onSubmit={onSubmit}
            image={image}
            selectedText={selectedText}
            showExplanationContext={showExplanationContext}
            explanation={explanation}
            onCloseExplanationContext={() => setShowExplanationContext(false)}
            activeTab={activeTab}
          />
        </>
      )}
      <div className={`tab-content ${activeTab === 'settings' ? 'active' : 'hidden'}`}>
        <SettingsComponent />
      </div>
    </div>
  );
};

export default ExplainWindow;

