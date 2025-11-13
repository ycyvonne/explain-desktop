import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

/**
 * Sends Cmd+C using key code (works better with VSCode and Chrome)
 */
export function sendCmdCWithKeyCode(): Promise<void> {
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

/**
 * Sends Cmd+C using keystroke (works better with Terminal)
 */
export function sendCmdCWithKeystroke(): Promise<void> {
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

/**
 * Utility function to delay execution
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Attempts to trigger copy command using multiple strategies.
 * Tries key code method first, then keystroke method.
 */
export async function triggerCopyCommand(): Promise<void> {
  const copyStrategies = [sendCmdCWithKeyCode, sendCmdCWithKeystroke];
  let lastError: unknown;

  for (const strategy of copyStrategies) {
    try {
      await strategy();
      await delay(80);
      return;
    } catch (error) {
      lastError = error;
      // Continue to next strategy
    }
  }

  // If all strategies failed, throw the last error
  throw lastError || new Error('All copy strategies failed');
}

