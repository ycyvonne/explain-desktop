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
      <div className="chat-preview" style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px', margin: '8px', maxHeight: '150px', overflow: 'auto' }}>
        <div style={{ fontSize: '13px', color: '#666', whiteSpace: 'pre-wrap' }}>{selectedText}</div>
      </div>
    );
  }

  return null;
};

export default ContentPreview;

