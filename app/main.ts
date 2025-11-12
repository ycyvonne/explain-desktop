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
  overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlay.setAlwaysOnTop(true, 'screen-saver');
  overlay.setBounds({ x: cursorPoint.x + 12, y: cursorPoint.y + 12, width: 520, height: 400 });
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

  const shortcut = 'CommandOrControl+Shift+E';
  const ok = globalShortcut.register(shortcut, async () => {
    const capture = await captureRegion();
    if (!capture) return;
    showOverlayNearCursor();
    overlay?.webContents.send('screenshot-ready', capture.dataUrl);
  });

  if (!ok) {
    console.error(`Failed to register global shortcut ${shortcut}`);
  }
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
