import type { ShortcutConfig } from '../types';

declare global {
  interface ScreenshotPayload {
    dataUrl: string;
    isExplain?: boolean;
  }

  interface TextSelectionPayload {
    text: string;
    isExplain?: boolean;
  }

  interface OverlayAPI {
    onScreenshot: (cb: (payload: ScreenshotPayload) => void) => void;
    onTextSelection: (cb: (payload: TextSelectionPayload) => void) => void;
    onHide: (cb: () => void) => void;
    hide: () => void;
  }

  interface SettingsAPI {
    getShortcuts: () => Promise<ShortcutConfig>;
    updateShortcut: (key: keyof ShortcutConfig, accelerator: string) => Promise<{ success: boolean; error?: string }>;
    resetShortcuts: () => Promise<boolean>;
    disableShortcuts: () => Promise<void>;
    enableShortcuts: () => Promise<void>;
  }

  interface Window {
    overlayAPI?: OverlayAPI;
    settingsAPI?: SettingsAPI;
  }

  // Re-export ShortcutConfig for global use
  type ShortcutConfig = import('../types').ShortcutConfig;
}

export {};
