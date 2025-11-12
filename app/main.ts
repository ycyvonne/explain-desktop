import { app, BrowserWindow, globalShortcut, ipcMain, screen } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

let overlay: BrowserWindow | null = null;

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
    overlay = null;
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
  overlay.setAlwaysOnTop(true, 'screen-saver');
  overlay.setBounds({ x: cursorPoint.x + 12, y: cursorPoint.y + 12, width: 520, height: 400 });
  overlay.showInactive();
  overlay.focus();
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
  overlay?.hide();
});
