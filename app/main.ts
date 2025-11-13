import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { toErrorMessage } from './errorUtils';
import type { ShortcutConfig } from './types';
import { DEFAULT_SHORTCUTS, isProtectedShortcut } from './main/config';
import { createOverlay, hideOverlay, sendToOverlay, showOverlayNearCursor } from './main/overlay';
import { captureRegion, captureSelectedText } from './main/capture';

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

// overlay helpers moved to ./main/overlay

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
    sendToOverlay('screenshot-ready', {
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
    sendToOverlay('screenshot-ready', {
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
    sendToOverlay('text-selection-ready', {
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
  hideOverlay();
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
