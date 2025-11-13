import { app, BrowserWindow, globalShortcut, ipcMain, screen, clipboard } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { triggerCopyCommand, delay } from './utils';
import { toErrorMessage } from './errorUtils';
import type { ShortcutConfig } from './types';

const execFileP = promisify(execFile);

let overlay: BrowserWindow | null = null;
let escapeRegistered = false;

const DEFAULT_SHORTCUTS: ShortcutConfig = {
  screenshotChat: 'CommandOrControl+Shift+X',
  screenshotExplain: 'CommandOrControl+Shift+E',
  textSelection: 'CommandOrControl+Shift+C',
};

// Protected system shortcuts that cannot be overridden
const PROTECTED_SHORTCUTS = [
  'CommandOrControl+C',      // Copy
  'CommandOrControl+V',      // Paste
  'CommandOrControl+X',      // Cut
  'CommandOrControl+A',      // Select All
  'CommandOrControl+Z',      // Undo
  'CommandOrControl+Shift+Z', // Redo (macOS)
  'CommandOrControl+Y',      // Redo (Windows/Linux)
  'CommandOrControl+S',      // Save
  'CommandOrControl+W',      // Close Window
  'CommandOrControl+Q',      // Quit
  'CommandOrControl+N',      // New
  'CommandOrControl+O',      // Open
  'CommandOrControl+P',      // Print
  'CommandOrControl+T',      // New Tab
  'CommandOrControl+Tab',   // Switch Tabs
  'CommandOrControl+Space',  // Spotlight/Search
  'CommandOrControl+Shift+Space', // Alternative search
  'Escape',                 // Escape key
];

function isProtectedShortcut(accelerator: string): boolean {
  return PROTECTED_SHORTCUTS.includes(accelerator);
}

let currentShortcuts: ShortcutConfig = { ...DEFAULT_SHORTCUTS };
let registeredShortcuts: Map<string, () => void> = new Map();

const CONFIG_PATH = path.join(app.getPath('userData'), 'shortcuts.json');

async function loadShortcuts(): Promise<ShortcutConfig> {
  try {
    const data = await fs.readFile(CONFIG_PATH, 'utf-8');
    const config = JSON.parse(data) as ShortcutConfig;
    // Validate config
    if (config.screenshotChat && config.screenshotExplain && config.textSelection) {
      return config;
    }
  } catch (err) {
    // File doesn't exist or is invalid, use defaults
  }
  return { ...DEFAULT_SHORTCUTS };
}

async function saveShortcuts(config: ShortcutConfig): Promise<void> {
  try {
    await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save shortcuts:', toErrorMessage(err));
    throw err;
  }
}

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

async function captureRegion(): Promise<{ dataUrl: string } | null> {
  const tmp = path.join(app.getPath('temp'), `icx-${Date.now()}.png`);
  try {
    await execFileP('/usr/sbin/screencapture', ['-i', '-x', tmp]);
  } catch (error) {
    if ((error as Error).message) {
      console.warn('Capture cancelled or failed:', toErrorMessage(error));
    }
    return null;
  }

  try {
    const buf = await fs.readFile(tmp);
    const dataUrl = `data:image/png;base64,${buf.toString('base64')}`;
    await fs.unlink(tmp).catch(() => undefined);
    return { dataUrl };
  } catch (err) {
    console.error('Failed to read captured image:', toErrorMessage(err));
    return null;
  }
}


async function captureSelectedText(): Promise<string | null> {
  const originalText = clipboard.readText();

    try {
    await triggerCopyCommand();

    const maxAttempts = 10;
    let capturedText = clipboard.readText();

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const didChange = originalText === '' ? capturedText !== '' : capturedText !== originalText;

      if (didChange) {
        break;
      }

      await delay(80);
      capturedText = clipboard.readText();
    }

    const didChange =
      originalText === '' ? capturedText !== '' : capturedText !== originalText;

    if (!didChange) {
      return null;
    }
    
    return capturedText || null;
  } catch (error) {
    console.error('Failed to capture selected text:', toErrorMessage(error));
    return null;
  } finally {
    clipboard.writeText(originalText);
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

function unregisterAllShortcuts() {
  registeredShortcuts.forEach((_, accelerator) => {
    globalShortcut.unregister(accelerator);
  });
  registeredShortcuts.clear();
}

async function registerShortcut(accelerator: string, handler: () => void): Promise<boolean> {
  // Unregister if already registered
  if (registeredShortcuts.has(accelerator)) {
    globalShortcut.unregister(accelerator);
  }
  
  const ok = globalShortcut.register(accelerator, handler);
  if (ok) {
    registeredShortcuts.set(accelerator, handler);
  }
  return ok;
}

async function registerAllShortcuts() {
  if (shortcutsDisabled) {
    return; // Don't register shortcuts if they're disabled
  }
  
  unregisterAllShortcuts();
  
  // Register screenshot chat shortcut
  const chatOk = await registerShortcut(currentShortcuts.screenshotChat, async () => {
    if (shortcutsDisabled) return;
    const capture = await captureRegion();
    if (!capture) return;
    showOverlayNearCursor();
    overlay?.webContents.send('screenshot-ready', {
      dataUrl: capture.dataUrl,
      isExplain: false,
    });
  });
  if (!chatOk) {
    console.error(`Failed to register global shortcut ${currentShortcuts.screenshotChat}`);
  }

  // Register screenshot explain shortcut
  const explainOk = await registerShortcut(currentShortcuts.screenshotExplain, async () => {
    if (shortcutsDisabled) return;
    const capture = await captureRegion();
    if (!capture) return;
    showOverlayNearCursor();
    overlay?.webContents.send('screenshot-ready', {
      dataUrl: capture.dataUrl,
      isExplain: true,
    });
  });
  if (!explainOk) {
    console.error(`Failed to register global shortcut ${currentShortcuts.screenshotExplain}`);
  }

  // Register text selection shortcut
  const textOk = await registerShortcut(currentShortcuts.textSelection, async () => {
    if (shortcutsDisabled) return;
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
  if (!textOk) {
    console.error(`Failed to register global shortcut ${currentShortcuts.textSelection}`);
  }
}

app.whenReady().then(async () => {
  createOverlay();
  
  // Load shortcuts from config
  currentShortcuts = await loadShortcuts();
  
  // Register all shortcuts
  await registerAllShortcuts();
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

ipcMain.handle('settings:get-shortcuts', async () => {
  return currentShortcuts;
});

ipcMain.handle('settings:update-shortcut', async (_, key: keyof ShortcutConfig, accelerator: string) => {
  // Check if shortcut is protected
  if (isProtectedShortcut(accelerator)) {
    return { success: false, error: 'This shortcut is protected and cannot be overridden' };
  }
  
  // Check if accelerator is already in use
  const isDuplicate = Object.values(currentShortcuts).some(
    (value, idx) => {
      const k = Object.keys(currentShortcuts)[idx] as keyof ShortcutConfig;
      return k !== key && value === accelerator;
    }
  );
  
  if (isDuplicate) {
    return { success: false, error: 'This shortcut is already in use' };
  }
  
  // Try to register the new shortcut temporarily to check if it's available
  const testHandler = () => {};
  const testOk = globalShortcut.register(accelerator, testHandler);
  if (!testOk) {
    return { success: false, error: 'This shortcut is in use by another application' };
  }
  globalShortcut.unregister(accelerator);
  
  // Update the shortcut
  const oldAccelerator = currentShortcuts[key];
  currentShortcuts[key] = accelerator;
  
  try {
    await saveShortcuts(currentShortcuts);
    await registerAllShortcuts();
    return { success: true };
  } catch (err) {
    // Revert on error
    currentShortcuts[key] = oldAccelerator;
    await registerAllShortcuts();
    return { success: false, error: 'Failed to save shortcut' };
  }
});

ipcMain.handle('settings:reset-shortcuts', async () => {
  currentShortcuts = { ...DEFAULT_SHORTCUTS };
  try {
    await saveShortcuts(currentShortcuts);
    await registerAllShortcuts();
    return true;
  } catch (err) {
    return false;
  }
});

let shortcutsDisabled = false;

ipcMain.handle('settings:disable-shortcuts', () => {
  shortcutsDisabled = true;
  unregisterAllShortcuts();
});

ipcMain.handle('settings:enable-shortcuts', async () => {
  shortcutsDisabled = false;
  await registerAllShortcuts();
});
