import { app, BrowserWindow, globalShortcut, ipcMain, screen, clipboard } from 'electron';
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
    overlay?.webContents.send('overlay-hidden');
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

function sendCmdCWithKeyCode(): Promise<void> {
  // Using key code 8 (C key) - works better with VSCode and Chrome
  return new Promise((resolve, reject) => {
    execFile(
      '/usr/bin/osascript',
      [
        '-e', 'tell application "System Events"',
        '-e', 'set frontApp to name of first application process whose frontmost is true',
        '-e', 'tell application process frontApp',
        '-e', 'key code 8 using command down',
        '-e', 'end tell',
        '-e', 'end tell',
      ],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

function sendCmdCWithKeystroke(): Promise<void> {
  // Using keystroke - works better with Terminal
  return new Promise((resolve, reject) => {
    execFile(
      '/usr/bin/osascript',
      ['-e', 'tell application "System Events" to keystroke "c" using {command down}'],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function captureSelectedText(): Promise<string | null> {
  try {
    const previousClipboardText = clipboard.readText(); // Save original clipboard
    
    // Try key code method first (works better with VSCode/Chrome)
    try {
      await sendCmdCWithKeyCode();
      await delay(100);
    } catch (err) {
      // If key code fails, try keystroke method
      await sendCmdCWithKeystroke();
      await delay(100);
    }
    
    // Poll the clipboard to see if it changed (with timeout)
    let captured = clipboard.readText();
    const maxAttempts = 8;
    let attempts = 0;
    
    // If clipboard didn't change, wait a bit more and check again
    while (captured === previousClipboardText && attempts < maxAttempts) {
      await delay(100);
      captured = clipboard.readText();
      attempts++;
    }
    
    // If we still have the same text, try the other method
    if (captured === previousClipboardText && previousClipboardText !== '') {
      try {
        await sendCmdCWithKeystroke(); // Try keystroke method (for Terminal)
        await delay(100);
        captured = clipboard.readText();
      } catch (err) {
        // If that fails, try key code again
        try {
          await sendCmdCWithKeyCode();
          await delay(100);
          captured = clipboard.readText();
        } catch (err2) {
          // Both methods failed, but continue to check clipboard
        }
      }
    }
    
    // Only return if we got something different (or if previous was empty and we got something)
    if (captured !== previousClipboardText || (previousClipboardText === '' && captured !== '')) {
      // Restore original clipboard contents
      if (previousClipboardText) {
        clipboard.writeText(previousClipboardText);
      }
      return captured || null;
    }
    
    // // Restore original clipboard contents
    // if (previousClipboardText) {
    //   clipboard.writeText(previousClipboardText);
    // }
    return null;
  } catch (error) {
    console.error('Failed to capture selected text:', error);
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
  // Center the window on the screen
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

app.whenReady().then(() => {
  createOverlay();

  const registerShortcut = (accelerator: string, isExplain: boolean) => {
    const ok = globalShortcut.register(accelerator, async () => {
      const capture = await captureRegion();
      if (!capture) return;
      showOverlayNearCursor();
      overlay?.webContents.send('screenshot-ready', {
        dataUrl: capture.dataUrl,
        isExplain,
      });
    });

    if (!ok) {
      console.error(`Failed to register global shortcut ${accelerator}`);
    }
  };

  registerShortcut('CommandOrControl+Shift+X', false);
  registerShortcut('CommandOrControl+Shift+E', true);

  // Register Cmd+Shift+C for text selection
  const textShortcutOk = globalShortcut.register('CommandOrControl+Shift+C', async () => {
    const selectedText = await captureSelectedText();
    if (!selectedText || !selectedText.trim()) {
      console.log('No text selected or captured');
      return;
    }
    
    showOverlayNearCursor();
    overlay?.webContents.send('text-selection-ready', {
      text: selectedText,
      isExplain: true,
    });
  });

  if (!textShortcutOk) {
    console.error('Failed to register global shortcut CommandOrControl+Shift+C');
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
