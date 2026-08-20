import { app, BrowserWindow, ipcMain, safeStorage } from 'electron';
import Anthropic from '@anthropic-ai/sdk';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, '..');
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

let win: BrowserWindow | null = null;

/** Soubor s historií pokusů v profilu uživatele. */
function historyFile(): string {
  return path.join(app.getPath('userData'), 'historie.json');
}

/** Soubor s API klíčem. Klíč je šifrovaný přes OS (DPAPI/Keychain), pokud je to možné. */
function keyFile(): string {
  return path.join(app.getPath('userData'), 'api-klic.bin');
}

function readHistory(): unknown[] {
  try {
    const raw = fs.readFileSync(historyFile(), 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeHistory(attempts: unknown[]): void {
  fs.writeFileSync(historyFile(), JSON.stringify(attempts, null, 2), 'utf-8');
}

function readApiKey(): string | null {
  try {
    const buf = fs.readFileSync(keyFile());
    if (safeStorage.isEncryptionAvailable()) return safeStorage.decryptString(buf);
    return buf.toString('utf-8');
  } catch {
    return null;
  }
}

function writeApiKey(key: string): void {
  const data = safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString(key)
    : Buffer.from(key, 'utf-8');
  fs.writeFileSync(keyFile(), data);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1180,
    height: 860,
    minWidth: 900,
    minHeight: 640,
    title: 'Pravidla hokeje 2026/27',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }
}

ipcMain.handle('history:read', () => readHistory());

ipcMain.handle('history:add', (_event, attempt: unknown) => {
  const attempts = readHistory();
  attempts.push(attempt);
  writeHistory(attempts);
  return attempts;
});

ipcMain.handle('history:clear', () => {
  writeHistory([]);
  return [];
});

ipcMain.handle('settings:read', () => ({ maApiKlic: readApiKey() !== null }));

ipcMain.handle('settings:setKey', (_event, key: string) => {
  writeApiKey(key.trim());
  return { maApiKlic: true };
});

ipcMain.handle('settings:clearKey', () => {
  try {
    fs.unlinkSync(keyFile());
  } catch {
    /* klíč nebyl uložen */
  }
  return { maApiKlic: false };
});

const SYSTEM_PROMPT = `Jsi asistent pro rozhodčí a hráče ledního hokeje. Odpovídáš na dotazy o pravidlech ledního hokeje 2026/27 (IIHF, český překlad ČSLH).

Odpovídej výhradně na základě úryvků pravidel, které dostaneš v uživatelské zprávě. Postupuj takto:
- Odpověz česky, stručně a konkrétně — nejdřív přímá odpověď, potom případné upřesnění.
- U každého tvrzení uveď číslo pravidla, ze kterého vychází, ve tvaru (pravidlo 81.3).
- Pokud úryvky na dotaz neodpovídají nebo odpověď neobsahují, řekni to jasně a nedomýšlej si. Nikdy si nevymýšlej čísla pravidel ani znění, které v úryvcích není.
- Pokud je situace v pravidlech ponechána na posouzení hlavního rozhodčího, uveď to.`;

ipcMain.handle(
  'assistant:ask',
  async (
    _event,
    dotaz: string,
    uryvky: { odkaz: string; text: string }[],
    historie: { role: 'user' | 'assistant'; text: string }[],
  ) => {
    const apiKey = readApiKey();
    if (!apiKey) {
      return { ok: false as const, chyba: 'Není uložen API klíč. Doplň ho v Nastavení.' };
    }

    const kontext = uryvky.map((u) => `[${u.odkaz}]\n${u.text}`).join('\n\n');
    const client = new Anthropic({ apiKey });

    try {
      const response = await client.beta.messages.create({
        model: 'claude-opus-5',
        max_tokens: 2000,
        betas: ['server-side-fallback-2026-06-01'],
        fallbacks: [{ model: 'claude-opus-4-8' }],
        system: SYSTEM_PROMPT,
        thinking: { type: 'adaptive' },
        output_config: { effort: 'medium' },
        messages: [
          ...historie.map((z) => ({ role: z.role, content: z.text })),
          {
            role: 'user' as const,
            content: `Úryvky z pravidel ledního hokeje 2026/27:\n\n${kontext}\n\n---\n\nDotaz: ${dotaz}`,
          },
        ],
      });

      if (response.stop_reason === 'refusal') {
        return { ok: false as const, chyba: 'Model na tento dotaz odmítl odpovědět.' };
      }

      const odpoved = response.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();

      if (!odpoved) {
        return { ok: false as const, chyba: 'Model nevrátil žádnou odpověď. Zkus dotaz zopakovat.' };
      }
      return { ok: true as const, odpoved };
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError) {
        return { ok: false as const, chyba: 'Neplatný API klíč. Zkontroluj ho v Nastavení.' };
      }
      if (error instanceof Anthropic.RateLimitError) {
        return { ok: false as const, chyba: 'Překročen limit požadavků. Zkus to za chvíli znovu.' };
      }
      if (error instanceof Anthropic.APIConnectionError) {
        return { ok: false as const, chyba: 'Nepodařilo se připojit k API. Zkontroluj internet.' };
      }
      if (error instanceof Anthropic.APIError) {
        return { ok: false as const, chyba: `Chyba API (${error.status}): ${error.message}` };
      }
      return { ok: false as const, chyba: 'Neočekávaná chyba při volání API.' };
    }
  },
);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.whenReady().then(createWindow);
