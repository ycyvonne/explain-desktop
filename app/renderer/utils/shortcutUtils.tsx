import React from 'react';
import { Command, Option, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Home, Delete } from 'lucide-react';

/**
 * Maps key names to their display icons and labels
 */
function getKeyDisplay(part: string): { icon: React.ReactNode | null; label: string } {
  switch (part) {
    case 'CommandOrControl':
    case 'Command':
      return { icon: <Command size={14} />, label: '' };
    case 'Control':
      return {
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3"></path>
            <path d="M9 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3"></path>
          </svg>
        ),
        label: '',
      };
    case 'Alt':
      return { icon: <Option size={14} />, label: '' };
    case 'Shift':
      return {
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m7 11 5-5 5 5"></path>
            <path d="M12 6v14"></path>
          </svg>
        ),
        label: '',
      };
    case 'Up':
      return { icon: <ArrowUp size={14} />, label: '' };
    case 'Down':
      return { icon: <ArrowDown size={14} />, label: '' };
    case 'Left':
      return { icon: <ArrowLeft size={14} />, label: '' };
    case 'Right':
      return { icon: <ArrowRight size={14} />, label: '' };
    case 'Home':
      return { icon: <Home size={14} />, label: '' };
    case 'End':
      return {
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 7l10 10M7 17L17 7"></path>
          </svg>
        ),
        label: '',
      };
    case 'PageUp':
      return {
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 15l-6-6-6 6"></path>
          </svg>
        ),
        label: '',
      };
    case 'PageDown':
      return {
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6"></path>
          </svg>
        ),
        label: '',
      };
    case 'Backspace':
    case 'Delete':
      return { icon: <Delete size={14} />, label: '' };
    case 'Escape':
      return { icon: null, label: 'Esc' };
    case 'Enter':
      return { icon: null, label: 'Enter' };
    case 'Tab':
      return { icon: null, label: 'Tab' };
    default:
      // For function keys (F1-F12) and regular keys
      if (part.startsWith('F') && /^F\d+$/.test(part)) {
        return { icon: null, label: part };
      }
      return { icon: null, label: part.toUpperCase() };
  }
}

/**
 * Formats an Electron accelerator string into a visual representation
 */
export function formatShortcut(accelerator: string): React.ReactNode {
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

    const { icon, label } = getKeyDisplay(part);

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
}

/**
 * Maps browser key events to Electron accelerator format
 */
const KEY_MAP: Record<string, string> = {
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

/**
 * Parses a keyboard event into an Electron accelerator string
 * Returns null if the key combination is invalid
 */
export function parseKeyPress(event: KeyboardEvent): string | null {
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
    key = KEY_MAP[key] || key;
  }

  parts.push(key);

  if (parts.length < 2) {
    return null; // Need at least one modifier + key
  }

  return parts.join('+');
}

