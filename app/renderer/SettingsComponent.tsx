import React, { useState, useEffect, useCallback } from 'react';

type ShortcutConfig = {
  screenshotChat: string;
  screenshotExplain: string;
  textSelection: string;
};

const DEFAULT_SHORTCUTS: ShortcutConfig = {
  textSelection: 'CommandOrControl+Shift+C',
  screenshotChat: 'CommandOrControl+Shift+X',
  screenshotExplain: 'CommandOrControl+Shift+E',
};

const SHORTCUT_LABELS: Record<keyof ShortcutConfig, string> = {
  textSelection: 'Text Selection',
  screenshotChat: 'Screenshot (Chat Mode)',
  screenshotExplain: 'Screenshot (Explain Mode)',
};

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

  const formatShortcut = (accelerator: string): string => {
    return accelerator
      .replace(/CommandOrControl/g, '⌘')
      .replace(/Command/g, '⌘')
      .replace(/Control/g, '⌃')
      .replace(/Alt/g, '⌥')
      .replace(/Shift/g, '⇧')
      .replace(/\+/g, '');
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
          {(Object.keys(shortcuts) as Array<keyof ShortcutConfig>).map((key) => (
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

