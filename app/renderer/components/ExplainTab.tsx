import React from 'react';
import ExplainComponent from './ExplainComponent';
import type { ExplainCache } from '../hooks/useExplanation';

type ExplainTabProps = {
  activeTab: string;
  image: string | null;
  selectedText: string | null;
  explainKey: number;
  explainLevel: number;
  onLevelChange: (level: number) => void;
  onExplanationChange: (explanation: string) => void;
  cache: ExplainCache;
  onAskFollowup: () => void;
};

const ExplainTab: React.FC<ExplainTabProps> = ({
  activeTab,
  image,
  selectedText,
  explainKey,
  explainLevel,
  onLevelChange,
  onExplanationChange,
  cache,
  onAskFollowup,
}) => {
  return (
    <div className={`tab-content ${activeTab === 'explain' ? 'active' : 'hidden'}`}>
      <ExplainComponent
        key={explainKey}
        image={image}
        text={selectedText}
        level={explainLevel}
        onLevelChange={onLevelChange}
        onExplanationChange={onExplanationChange}
        cache={cache}
        onAskFollowup={onAskFollowup}
      />
    </div>
  );
};

export default ExplainTab;

