import type { ShortcutConfig } from '../types';

export const DEFAULT_SHORTCUTS: ShortcutConfig = {
  screenshotChat: 'CommandOrControl+Shift+X',
  screenshotExplain: 'CommandOrControl+Shift+E',
  textSelection: 'CommandOrControl+Shift+C',
};

// Protected system shortcuts that cannot be overridden
export const PROTECTED_SHORTCUTS = [
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
] as const;

export function isProtectedShortcut(accelerator: string): boolean {
  return PROTECTED_SHORTCUTS.includes(accelerator as (typeof PROTECTED_SHORTCUTS)[number]);
}


