import { contextBridge, ipcRenderer } from 'electron';
import type { ShortcutConfig } from './types';

type ScreenshotPayload = {
  dataUrl: string;
  isExplain?: boolean;
};

type TextSelectionPayload = {
  text: string;
  isExplain?: boolean;
};

type ScreenshotCallback = (payload: ScreenshotPayload) => void;
type TextSelectionCallback = (payload: TextSelectionPayload) => void;

contextBridge.exposeInMainWorld('overlayAPI', {
  onScreenshot: (cb: ScreenshotCallback) => {
    ipcRenderer.removeAllListeners('screenshot-ready');
    ipcRenderer.on('screenshot-ready', (_event, payload: ScreenshotPayload | string) => {
      if (typeof payload === 'string') {
        cb({ dataUrl: payload, isExplain: false });
        return;
      }
      cb(payload);
    });
  },
  onTextSelection: (cb: TextSelectionCallback) => {
    ipcRenderer.removeAllListeners('text-selection-ready');
    ipcRenderer.on('text-selection-ready', (_event, payload: TextSelectionPayload) => {
      cb(payload);
    });
  },
  onHide: (cb: () => void) => {
    ipcRenderer.removeAllListeners('overlay-hidden');
    ipcRenderer.on('overlay-hidden', () => {
      cb();
    });
  },
  hide: () => ipcRenderer.send('overlay-hide'),
});

contextBridge.exposeInMainWorld('settingsAPI', {
  getShortcuts: (): Promise<ShortcutConfig> => {
    return ipcRenderer.invoke('settings:get-shortcuts');
  },
  updateShortcut: (key: keyof ShortcutConfig, accelerator: string): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('settings:update-shortcut', key, accelerator);
  },
  resetShortcuts: (): Promise<boolean> => {
    return ipcRenderer.invoke('settings:reset-shortcuts');
  },
  disableShortcuts: (): Promise<void> => {
    return ipcRenderer.invoke('settings:disable-shortcuts');
  },
  enableShortcuts: (): Promise<void> => {
    return ipcRenderer.invoke('settings:enable-shortcuts');
  },
});
