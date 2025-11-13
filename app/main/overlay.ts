import { BrowserWindow, globalShortcut, screen } from 'electron';
import path from 'node:path';
import { toErrorMessage } from '../errorUtils';

let overlay: BrowserWindow | null = null;
let escapeRegistered = false;

function ensureEscapeShortcut() {
  if (escapeRegistered) return;
  const ok = globalShortcut.register('Escape', () => {
    if (!overlay || overlay.isDestroyed() || !overlay.isVisible()) return;
    overlay.hide();
  });
  if (!ok) {
    console.warn('Failed to register Escape shortcut for overlay');
    return;
  }
  escapeRegistered = true;
}

function releaseEscapeShortcut() {
  if (!escapeRegistered) return;
  globalShortcut.unregister('Escape');
  escapeRegistered = false;
}

export function getOverlay(): BrowserWindow | null {
  return overlay;
}

export function hideOverlay() {
  releaseEscapeShortcut();
  overlay?.hide();
}

export function createOverlay() {
  overlay = new BrowserWindow({
    width: 720,
    height: 600,
    minWidth: 360,
    minHeight: 280,
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: true,
    focusable: true,
    fullscreenable: false,
    show: false,
    webPreferences: {
      // __dirname => dist/main; preload is emitted to dist/preload.js
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
    },
  });

  // __dirname points to dist/main when compiled; renderer lives in dist/renderer
  const rendererPath = path.join(__dirname, '..', 'renderer', 'index.html');
  overlay.loadFile(rendererPath).catch((err) => {
    console.error('Failed to load renderer:', toErrorMessage(err));
  });

  overlay.on('closed', () => {
    releaseEscapeShortcut();
    overlay = null;
  });

  overlay.on('hide', () => {
    overlay?.webContents.send('overlay-hidden');
    releaseEscapeShortcut();
  });
}

export function showOverlayNearCursor() {
  if (!overlay) {
    createOverlay();
  }
  if (!overlay) return;

  const cursorPoint = screen.getCursorScreenPoint();
  const displayBounds = screen.getDisplayNearestPoint(cursorPoint).workArea;
  const { width: overlayWidth, height: overlayHeight } = overlay.getBounds();
  const targetX = displayBounds.x + (displayBounds.width - overlayWidth) / 2;
  const targetY = displayBounds.y + (displayBounds.height - overlayHeight) / 2;
  overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlay.setAlwaysOnTop(true, 'screen-saver');
  overlay.setBounds({ x: targetX, y: targetY, width: overlayWidth, height: overlayHeight });
  overlay.showInactive();
  setTimeout(() => {
    if (!overlay || overlay.isDestroyed()) return;
    overlay.setVisibleOnAllWorkspaces(false);
  }, 0);
  setTimeout(() => {
    if (!overlay || overlay.isDestroyed()) return;
    overlay.webContents.focus();
  }, 0);
  ensureEscapeShortcut();
}

export function sendToOverlay(channel: string, payload: unknown) {
  overlay?.webContents.send(channel, payload as any);
}


