import { app, BrowserWindow, globalShortcut, ipcMain, screen } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

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

function createOverlay() {
  overlay = new BrowserWindow({
    width: 520,
    height: 400,
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
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  });
  
  const rendererPath = path.join(__dirname, 'renderer', 'index.html');
  overlay.loadFile(rendererPath).catch((err) => {
    console.error('Failed to load renderer:', err);
  });

  overlay.on('closed', () => {
    releaseEscapeShortcut();
    overlay = null;
  });

  overlay.on('hide', () => {
    releaseEscapeShortcut();
  });
}

async function captureRegion(): Promise<{ dataUrl: string } | null> {
  const tmp = path.join(app.getPath('temp'), `icx-${Date.now()}.png`);
  try {
    await execFileP('/usr/sbin/screencapture', ['-i', '-x', tmp]);
  } catch (error) {
    if ((error as Error).message) {
      console.warn('Capture cancelled or failed:', (error as Error).message);
    }
    return null;
  }

  try {
    const buf = await fs.readFile(tmp);
    const dataUrl = `data:image/png;base64,${buf.toString('base64')}`;
    await fs.unlink(tmp).catch(() => undefined);
    return { dataUrl };
  } catch (err) {
    console.error('Failed to read captured image:', err);
    return null;
  }
}

function showOverlayNearCursor() {
  if (!overlay) {
    createOverlay();
  }
  if (!overlay) return;

  const cursorPoint = screen.getCursorScreenPoint();
  const displayBounds = screen.getDisplayNearestPoint(cursorPoint).workArea;
  const { width: overlayWidth, height: overlayHeight } = overlay.getBounds();
  const targetX = Math.min(
    Math.max(cursorPoint.x - overlayWidth, displayBounds.x),
    displayBounds.x + displayBounds.width - overlayWidth,
  );
  const targetY = Math.min(
    Math.max(cursorPoint.y - overlayHeight, displayBounds.y),
    displayBounds.y + displayBounds.height - overlayHeight,
  );
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

app.whenReady().then(() => {
  createOverlay();

  const registerShortcut = (accelerator: string, autoSend: boolean) => {
    const ok = globalShortcut.register(accelerator, async () => {
      const capture = await captureRegion();
      if (!capture) return;
      showOverlayNearCursor();
      overlay?.webContents.send('screenshot-ready', {
        dataUrl: capture.dataUrl,
        autoSend,
      });
    });

    if (!ok) {
      console.error(`Failed to register global shortcut ${accelerator}`);
    }
  };

  registerShortcut('CommandOrControl+Shift+X', false);
  registerShortcut('CommandOrControl+Shift+E', true);
});

app.on('window-all-closed', (event: Electron.Event) => {
  event.preventDefault();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

ipcMain.on('overlay-hide', () => {
  releaseEscapeShortcut();
  overlay?.hide();
});
