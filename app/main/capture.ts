import { app, clipboard } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { triggerCopyCommand, delay } from '../utils';
import { toErrorMessage } from '../errorUtils';

const execFileP = promisify(execFile);

export async function captureRegion(): Promise<{ dataUrl: string } | null> {
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

export async function captureSelectedText(): Promise<string | null> {
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


