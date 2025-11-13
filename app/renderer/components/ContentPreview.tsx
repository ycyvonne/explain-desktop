import React from 'react';

type ContentPreviewProps = {
  image: string | null;
  selectedText: string | null;
  activeTab: string;
};

const ContentPreview: React.FC<ContentPreviewProps> = ({ image, selectedText, activeTab }) => {
  if (activeTab === 'settings') {
    return null;
  }

  if (image) {
    return (
      <div className="chat-preview">
        <img src={image} alt="Screenshot preview" />
      </div>
    );
  }

  if (selectedText) {
    return (
      <div className="chat-preview text-selection-preview">
        <div className="text-selection-content">{selectedText}</div>
      </div>
    );
  }

  return null;
};

export default ContentPreview;

