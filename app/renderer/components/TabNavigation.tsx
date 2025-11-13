import React from 'react';
import { Tab } from '../hooks/useExplainWindowState';

type TabNavigationProps = {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  hasContent: boolean;
};

const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange, hasContent }) => {
  return (
    <div className="tab-container">
      {hasContent && (
        <>
          <button
            className={`tab-button ${activeTab === 'explain' ? 'active' : ''}`}
            onClick={() => onTabChange('explain')}
            type="button"
          >
            Explain
          </button>
          <button
            className={`tab-button ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => onTabChange('chat')}
            type="button"
          >
            Chat
          </button>
        </>
      )}
      <button
        className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
        onClick={() => onTabChange('settings')}
        type="button"
      >
        Settings
      </button>
    </div>
  );
};

export default TabNavigation;

