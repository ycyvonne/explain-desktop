import { contextBridge, ipcRenderer } from 'electron';

type ScreenshotPayload = {
  dataUrl: string;
  autoSend?: boolean;
};

type ScreenshotCallback = (payload: ScreenshotPayload) => void;

contextBridge.exposeInMainWorld('overlayAPI', {
  onScreenshot: (cb: ScreenshotCallback) => {
    ipcRenderer.removeAllListeners('screenshot-ready');
    ipcRenderer.on('screenshot-ready', (_event, payload: ScreenshotPayload | string) => {
      if (typeof payload === 'string') {
        cb({ dataUrl: payload, autoSend: false });
        return;
      }
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
