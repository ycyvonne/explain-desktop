declare global {
  interface ScreenshotPayload {
    dataUrl: string;
    autoSend?: boolean;
  }

  interface OverlayAPI {
    onScreenshot: (cb: (payload: ScreenshotPayload) => void) => void;
    hide: () => void;
  }

  interface Window {
    overlayAPI?: OverlayAPI;
  }
}

export {};
