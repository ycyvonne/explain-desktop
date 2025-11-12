declare global {
  interface ScreenshotPayload {
    dataUrl: string;
    isExplain?: boolean;
  }

  interface OverlayAPI {
    onScreenshot: (cb: (payload: ScreenshotPayload) => void) => void;
    onHide: (cb: () => void) => void;
    hide: () => void;
  }

  interface Window {
    overlayAPI?: OverlayAPI;
  }
}

export {};
