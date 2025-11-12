declare global {
  interface OverlayAPI {
    onScreenshot: (cb: (dataUrl: string) => void) => void;
    hide: () => void;
  }

  interface Window {
    overlayAPI?: OverlayAPI;
  }
}

export {};
