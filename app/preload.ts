import { contextBridge, ipcRenderer } from 'electron';

type ScreenshotCallback = (dataUrl: string) => void;

contextBridge.exposeInMainWorld('overlayAPI', {
  onScreenshot: (cb: ScreenshotCallback) => {
    ipcRenderer.removeAllListeners('screenshot-ready');
    ipcRenderer.on('screenshot-ready', (_event, dataUrl: string) => cb(dataUrl));
  },
  hide: () => ipcRenderer.send('overlay-hide'),
});
