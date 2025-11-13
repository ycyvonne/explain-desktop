import type { ShortcutConfig } from '../../types';

/**
 * Protected system shortcuts that cannot be overridden
 * Must match the list in app/main.ts
 */
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

// Re-export for convenience
export type { ShortcutConfig };

export const DEFAULT_SHORTCUTS: ShortcutConfig = {
  textSelection: 'CommandOrControl+Shift+C',
  screenshotChat: 'CommandOrControl+Shift+X',
  screenshotExplain: 'CommandOrControl+Shift+E',
};

export const SHORTCUT_LABELS: Record<keyof ShortcutConfig, string> = {
  textSelection: 'Text Selection',
  screenshotChat: 'Screenshot (Chat)',
  screenshotExplain: 'Screenshot (Explain)',
};

// Define the order in which shortcuts should be displayed
export const SHORTCUT_ORDER: Array<keyof ShortcutConfig> = [
  'textSelection',
  'screenshotExplain',
  'screenshotChat',
];

