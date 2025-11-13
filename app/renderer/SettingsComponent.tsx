import React, { useState, useEffect, useCallback } from 'react';
import { Command, Option, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Home, Delete } from 'lucide-react';

type ShortcutConfig = {
  textSelection: string;
  screenshotChat: string;
  screenshotExplain: string;
};

const DEFAULT_SHORTCUTS: ShortcutConfig = {
  textSelection: 'CommandOrControl+Shift+C',
  screenshotChat: 'CommandOrControl+Shift+X',
  screenshotExplain: 'CommandOrControl+Shift+E',
};

const SHORTCUT_LABELS: Record<keyof ShortcutConfig, string> = {
  textSelection: 'Text Selection',
  screenshotChat: 'Screenshot (Chat)',
  screenshotExplain: 'Screenshot (Explain)',
};

// Define the order in which shortcuts should be displayed
const SHORTCUT_ORDER: Array<keyof ShortcutConfig> = [
  'textSelection',
  'screenshotExplain',
  'screenshotChat',
];

// Protected system shortcuts that cannot be overridden (must match main.ts)
const PROTECTED_SHORTCUTS = [
  'CommandOrControl+C',      // Copy
  'CommandOrControl+V',      // Paste
  'CommandOrControl+X',      // Cut
  'CommandOrControl+A',      // Select All
  'CommandOrControl+Z',      // Undo
  'CommandOrControl+Shift+Z', // Redo (macOS)
  'CommandOrControl+Y',      // Redo (Windows/Linux)
  'CommandOrControl+S',      // Save
  'CommandOrControl+W',      // Close Window
  'CommandOrControl+Q',      // Quit
  'CommandOrControl+N',      // New
  'CommandOrControl+O',      // Open
  'CommandOrControl+P',      // Print
  'CommandOrControl+T',      // New Tab
  'CommandOrControl+Tab',   // Switch Tabs
  'CommandOrControl+Space',  // Spotlight/Search
  'CommandOrControl+Shift+Space', // Alternative search
  'Escape',                 // Escape key
];

const SettingsComponent: React.FC = () => {
  const [shortcuts, setShortcuts] = useState<ShortcutConfig>(DEFAULT_SHORTCUTS);
  const [editingKey, setEditingKey] = useState<keyof ShortcutConfig | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    // Load shortcuts from main process
    window.settingsAPI?.getShortcuts().then((config) => {
      if (config) {
        setShortcuts(config);
      }
    });
  }, []);

  const formatShortcut = (accelerator: string): React.ReactNode => {
    const parts = accelerator.split('+');
    const elements: React.ReactNode[] = [];
    
    parts.forEach((part, index) => {
      if (index > 0) {
        elements.push(
          <span key={`plus-${index}`} style={{ margin: '0 4px', color: 'rgba(255, 255, 255, 0.4)' }}>
            +
          </span>
        );
      }
      
      let icon: React.ReactNode = null;
      let label: string = part;
      
      switch (part) {
        case 'CommandOrControl':
        case 'Command':
          icon = <Command size={14} />;
          label = '';
          break;
        case 'Control':
          // Use a custom SVG for Control key since lucide-react doesn't have it
          icon = (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3"></path>
              <path d="M9 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3"></path>
            </svg>
          );
          label = '';
          break;
        case 'Alt':
          icon = <Option size={14} />;
          label = '';
          break;
        case 'Shift':
          // Use a custom SVG for Shift key
          icon = (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m7 11 5-5 5 5"></path>
              <path d="M12 6v14"></path>
            </svg>
          );
          label = '';
          break;
        case 'Up':
          icon = <ArrowUp size={14} />;
          label = '';
          break;
        case 'Down':
          icon = <ArrowDown size={14} />;
          label = '';
          break;
        case 'Left':
          icon = <ArrowLeft size={14} />;
          label = '';
          break;
        case 'Right':
          icon = <ArrowRight size={14} />;
          label = '';
          break;
        case 'Home':
          icon = <Home size={14} />;
          label = '';
          break;
        case 'End':
          // Use a custom SVG for End key
          icon = (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 7l10 10M7 17L17 7"></path>
            </svg>
          );
          label = '';
          break;
        case 'PageUp':
          // Use a custom SVG for PageUp
          icon = (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 15l-6-6-6 6"></path>
            </svg>
          );
          label = '';
          break;
        case 'PageDown':
          // Use a custom SVG for PageDown
          icon = (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6 6 6-6"></path>
            </svg>
          );
          label = '';
          break;
        case 'Backspace':
        case 'Delete':
          icon = <Delete size={14} />;
          label = '';
          break;
        case 'Escape':
          label = 'Esc';
          break;
        case 'Enter':
          label = 'Enter';
          break;
        case 'Tab':
          label = 'Tab';
          break;
        default:
          // For function keys (F1-F12) and regular keys
          if (part.startsWith('F') && /^F\d+$/.test(part)) {
            label = part;
          } else {
            label = part.toUpperCase();
          }
          break;
      }
      
      elements.push(
        <span
          key={part}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: icon ? '24px' : 'auto',
            height: '24px',
            padding: icon ? '0 6px' : '0 8px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '4px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            fontSize: '12px',
            fontFamily: icon ? 'inherit' : 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", "Courier New", monospace',
            color: 'rgba(255, 255, 255, 0.9)',
            gap: '4px',
          }}
        >
          {icon}
          {label && <span>{label}</span>}
        </span>
      );
    });
    
    return <span style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap: '2px' }}>{elements}</span>;
  };

  const parseKeyPress = useCallback((event: KeyboardEvent): string | null => {
    const parts: string[] = [];
    
    // Use CommandOrControl for Electron compatibility (works on both Mac and Windows/Linux)
    if (event.metaKey || event.ctrlKey) {
      parts.push('CommandOrControl');
    }
    
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) parts.push('Shift');
    
    // Get the main key
    if (event.key === 'Meta' || event.key === 'Control' || event.key === 'Alt' || event.key === 'Shift') {
      return null; // Don't register modifier-only keys
    }
    
    let key = event.key;
    if (key.length === 1) {
      key = key.toUpperCase();
    } else {
      // Map special keys
      const keyMap: Record<string, string> = {
        'Escape': 'Escape',
        'Enter': 'Enter',
        'Tab': 'Tab',
        'Backspace': 'Backspace',
        'Delete': 'Delete',
        'ArrowUp': 'Up',
        'ArrowDown': 'Down',
        'ArrowLeft': 'Left',
        'ArrowRight': 'Right',
        'Home': 'Home',
        'End': 'End',
        'PageUp': 'PageUp',
        'PageDown': 'PageDown',
        'F1': 'F1', 'F2': 'F2', 'F3': 'F3', 'F4': 'F4',
        'F5': 'F5', 'F6': 'F6', 'F7': 'F7', 'F8': 'F8',
        'F9': 'F9', 'F10': 'F10', 'F11': 'F11', 'F12': 'F12',
      };
      key = keyMap[key] || key;
    }
    
    parts.push(key);
    
    if (parts.length < 2) {
      return null; // Need at least one modifier + key
    }
    
    return parts.join('+');
  }, []);

  const startEditing = (key: keyof ShortcutConfig) => {
    setEditingKey(key);
    setCapturing(true);
    setError(null);
    setSuccess(null);
  };

  const cancelEditing = useCallback(async () => {
    setEditingKey(null);
    setCapturing(false);
    setError(null);
    // Re-enable shortcuts when canceling
    await window.settingsAPI?.enableShortcuts();
  }, []);

  useEffect(() => {
    if (!capturing || !editingKey) return;

    // Disable global shortcuts while capturing
    window.settingsAPI?.disableShortcuts();

    const handleKeyDown = async (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      
      // Allow Escape to cancel editing
      if (event.key === 'Escape') {
        await cancelEditing();
        return;
      }
      
      const accelerator = parseKeyPress(event);
      if (!accelerator) {
        setError('Please press a key combination with at least one modifier (⌘, ⌃, ⌥, or ⇧)');
        return;
      }

      // Check if shortcut is protected
      if (PROTECTED_SHORTCUTS.includes(accelerator)) {
        setError('This shortcut is protected and cannot be overridden (e.g., ⌘C for Copy, ⌘V for Paste)');
        return;
      }

      // Check if shortcut is already in use
      const isDuplicate = Object.values(shortcuts).some(
        (value, idx) => {
          const key = Object.keys(shortcuts)[idx] as keyof ShortcutConfig;
          return key !== editingKey && value === accelerator;
        }
      );

      if (isDuplicate) {
        setError('This shortcut is already in use');
        return;
      }

      // Try to update the shortcut
      try {
        const result = await window.settingsAPI?.updateShortcut(editingKey, accelerator);
        if (result?.success) {
          setShortcuts((prev) => ({ ...prev, [editingKey]: accelerator }));
          setSuccess('Shortcut updated successfully');
          setEditingKey(null);
          setCapturing(false);
          setError(null);
          setTimeout(() => setSuccess(null), 2000);
          // Re-enable shortcuts after successful update
          await window.settingsAPI?.enableShortcuts();
        } else {
          setError(result?.error || 'Failed to update shortcut. It may be in use by another application.');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update shortcut');
      }
    };

    window.addEventListener('keydown', handleKeyDown, true); // Use capture phase
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      // Re-enable shortcuts when cleanup happens
      window.settingsAPI?.enableShortcuts();
    };
  }, [capturing, editingKey, shortcuts, parseKeyPress, cancelEditing]);

  const resetToDefaults = async () => {
    try {
      const updated = await window.settingsAPI?.resetShortcuts();
      if (updated) {
        setShortcuts(DEFAULT_SHORTCUTS);
        setSuccess('Shortcuts reset to defaults');
        setTimeout(() => setSuccess(null), 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset shortcuts');
    }
  };

  return (
    <div className="settings-container">
      <div className="settings-section">
        <h2 className="settings-title">Keyboard Shortcuts</h2>
        <p className="settings-description">
          Configure global keyboard shortcuts for the application. Press a key combination to set a new shortcut.
        </p>
        
        {error && (
          <div className="settings-message settings-error">
            {error}
          </div>
        )}
        
        {success && (
          <div className="settings-message settings-success">
            {success}
          </div>
        )}

        <div className="shortcuts-list">
          {SHORTCUT_ORDER.map((key) => (
            <div key={key} className="shortcut-item">
              <div className="shortcut-label">{SHORTCUT_LABELS[key]}</div>
              <div className="shortcut-controls">
                {editingKey === key && capturing ? (
                  <div className="shortcut-editing">
                    <span className="shortcut-placeholder">Press a key combination...</span>
                    <button
                      type="button"
                      className="shortcut-cancel"
                      onClick={cancelEditing}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="shortcut-display">{formatShortcut(shortcuts[key])}</div>
                    <button
                      type="button"
                      className="shortcut-edit"
                      onClick={() => startEditing(key)}
                      disabled={editingKey !== null}
                    >
                      Change
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="settings-actions">
          <button
            type="button"
            className="settings-reset"
            onClick={resetToDefaults}
            disabled={editingKey !== null}
          >
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsComponent;

