import React, { useState, useEffect } from 'react';
import { toErrorMessage } from '../../errorUtils';
import ShortcutInput from './ShortcutInput';
import {
  DEFAULT_SHORTCUTS,
  SHORTCUT_LABELS,
  SHORTCUT_ORDER,
  PROTECTED_SHORTCUTS,
  type ShortcutConfig,
} from '../utils/shortcutConstants';

const SettingsComponent: React.FC = () => {
  const [shortcuts, setShortcuts] = useState<ShortcutConfig>(DEFAULT_SHORTCUTS);
  const [editingKey, setEditingKey] = useState<keyof ShortcutConfig | null>(null);
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

  const startEditing = (key: keyof ShortcutConfig) => {
    setEditingKey(key);
    setError(null);
    setSuccess(null);
  };

  const cancelEditing = async () => {
    setEditingKey(null);
    setError(null);
    // Re-enable shortcuts when canceling
    await window.settingsAPI?.enableShortcuts();
  };

  const handleSave = async (accelerator: string) => {
    if (!editingKey) return;

    try {
      const result = await window.settingsAPI?.updateShortcut(editingKey, accelerator);
      if (result?.success) {
        setShortcuts((prev) => ({ ...prev, [editingKey]: accelerator }));
        setSuccess('Shortcut updated successfully');
        setEditingKey(null);
        setError(null);
        setTimeout(() => setSuccess(null), 2000);
        // Re-enable shortcuts after successful update
        await window.settingsAPI?.enableShortcuts();
      } else {
        setError(result?.error || 'Failed to update shortcut. It may be in use by another application.');
      }
    } catch (err) {
      setError(toErrorMessage(err) || 'Failed to update shortcut');
    }
  };

  const resetToDefaults = async () => {
    try {
      const updated = await window.settingsAPI?.resetShortcuts();
      if (updated) {
        setShortcuts(DEFAULT_SHORTCUTS);
        setSuccess('Shortcuts reset to defaults');
        setTimeout(() => setSuccess(null), 2000);
      }
    } catch (err) {
      setError(toErrorMessage(err) || 'Failed to reset shortcuts');
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
                <ShortcutInput
                  isEditing={editingKey === key}
                  currentValue={shortcuts[key]}
                  onSave={handleSave}
                  onCancel={cancelEditing}
                  onError={setError}
                  protectedShortcuts={PROTECTED_SHORTCUTS}
                  existingShortcuts={shortcuts}
                  editingKey={key}
                />
                {editingKey !== key && (
                  <button
                    type="button"
                    className="shortcut-edit"
                    onClick={() => startEditing(key)}
                    disabled={editingKey !== null}
                  >
                    Change
                  </button>
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
