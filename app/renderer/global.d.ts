declare global {
  interface ScreenshotPayload {
    dataUrl: string;
    isExplain?: boolean;
  }

  interface TextSelectionPayload {
    text: string;
    isExplain?: boolean;
  }

  type ShortcutConfig = {
    screenshotChat: string;
    screenshotExplain: string;
    textSelection: string;
  };

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
}

export {};
