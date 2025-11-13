import React, { useEffect } from 'react';
import { formatShortcut, parseKeyPress } from '../utils/shortcutUtils';

type ShortcutInputProps = {
  isEditing: boolean;
  currentValue: string;
  onSave: (accelerator: string) => Promise<void>;
  onCancel: () => Promise<void>;
  onError: (error: string) => void;
  protectedShortcuts: readonly string[];
  existingShortcuts: Record<string, string>;
  editingKey: string;
};

const ShortcutInput: React.FC<ShortcutInputProps> = ({
  isEditing,
  currentValue,
  onSave,
  onCancel,
  onError,
  protectedShortcuts,
  existingShortcuts,
  editingKey,
}) => {
  useEffect(() => {
    if (!isEditing) return;

    // Disable global shortcuts while capturing
    window.settingsAPI?.disableShortcuts();

    const handleKeyDown = async (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      // Allow Escape to cancel editing
      if (event.key === 'Escape') {
        await onCancel();
        return;
      }

      const accelerator = parseKeyPress(event);
      if (!accelerator) {
        onError('Please press a key combination with at least one modifier (⌘, ⌃, ⌥, or ⇧)');
        return;
      }

      // Check if shortcut is protected
      if (protectedShortcuts.includes(accelerator)) {
        onError('This shortcut is protected and cannot be overridden (e.g., ⌘C for Copy, ⌘V for Paste)');
        return;
      }

      // Check if shortcut is already in use
      const isDuplicate = Object.entries(existingShortcuts).some(
        ([key, value]) => key !== editingKey && value === accelerator
      );

      if (isDuplicate) {
        onError('This shortcut is already in use');
        return;
      }

      // Try to save the shortcut
      await onSave(accelerator);
    };

    window.addEventListener('keydown', handleKeyDown, true); // Use capture phase
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      // Re-enable shortcuts when cleanup happens
      window.settingsAPI?.enableShortcuts();
    };
  }, [isEditing, onSave, onCancel, onError, protectedShortcuts, existingShortcuts, editingKey]);

  if (isEditing) {
    return (
      <div className="shortcut-editing">
        <span className="shortcut-placeholder">Press a key combination...</span>
        <button type="button" className="shortcut-cancel" onClick={onCancel}>
          Cancel
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="shortcut-display">{formatShortcut(currentValue)}</div>
    </>
  );
};

export default ShortcutInput;

