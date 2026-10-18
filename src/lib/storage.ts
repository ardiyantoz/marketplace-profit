import type { Dataset, Settings } from './types';

// Everything stays in this browser's IndexedDB: nothing is sent anywhere.
const DB = 'profit-toko';
const STORE = 'state';
const KEY = 'v2';

export interface Persisted {
  data: Dataset;
  settings: Settings;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Dates go in as ISO strings and come back as Date objects (an invalid date as null -> NaN).
const DATE_FIELDS = new Set(['date', 'settled']);

function revive(raw: string): Persisted {
  const parsed = JSON.parse(raw, (key, value) => {
    if (!DATE_FIELDS.has(key)) return value;
    if (value === null) return null;
    // Expense dates stay YYYY-MM-DD strings.
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    return typeof value === 'string' ? new Date(value) : value;
  }) as Persisted;
  // An order whose date could not be read was saved as null; orders always carry a Date.
  for (const o of parsed.data.orders) if (!o.date) o.date = new Date(NaN);
  return parsed;
}

export async function loadState(): Promise<Persisted | null> {
  try {
    const raw = await run<string | undefined>('readonly', (s) => s.get(KEY) as IDBRequest<string | undefined>);
    return raw ? revive(raw) : null;
  } catch {
    return null;
  }
}

export async function saveState(state: Persisted): Promise<boolean> {
  try {
    await run('readwrite', (s) => s.put(JSON.stringify(state), KEY));
    return true;
  } catch {
    return false;
  }
}

export async function clearState(): Promise<void> {
  try {
    await run('readwrite', (s) => s.delete(KEY));
  } catch {
    /* nothing stored */
  }
}

// A backup file is the same JSON the browser keeps, wrapped with an app marker.
const BACKUP_APP = 'profit-toko';

export function downloadBackup(state: Persisted): void {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const blob = new Blob([JSON.stringify({ app: BACKUP_APP, version: 2, ...state })], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `profit-toko-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Null when the file is not a Profit Toko backup. */
export async function readBackup(file: File): Promise<Persisted | null> {
  try {
    const parsed = revive(await file.text()) as Persisted & { app?: string };
    if (parsed.app !== BACKUP_APP || !Array.isArray(parsed.data?.stores) || !Array.isArray(parsed.data?.orders)) return null;
    return { data: parsed.data, settings: parsed.settings };
  } catch {
    return null;
  }
}
