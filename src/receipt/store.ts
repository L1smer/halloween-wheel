import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PrizeId } from '../prizes';

// Receipts that already got a spin, and a log of issued prizes for staff.
// Both stay on this iPad only.

const USED_KEY = 'hw.usedReceipts.v1';
const LOG_KEY = 'hw.prizeLog.v1';

export type PrizeLogEntry = { code: string; prize: PrizeId; total: number; at: string; receipt: string | null; typedByStaff: boolean };

async function readJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function isReceiptUsed(fingerprint: string) {
  const used = await readJSON<Record<string, string>>(USED_KEY, {});
  return fingerprint in used;
}

/** Marks a receipt as spent. Called when the wheel is spun, not when it is scanned. */
export async function markReceiptUsed(fingerprint: string) {
  const used = await readJSON<Record<string, string>>(USED_KEY, {});
  used[fingerprint] = new Date().toISOString();
  await AsyncStorage.setItem(USED_KEY, JSON.stringify(used));
}

export async function logPrize(entry: PrizeLogEntry) {
  const log = await readJSON<PrizeLogEntry[]>(LOG_KEY, []);
  log.push(entry);
  await AsyncStorage.setItem(LOG_KEY, JSON.stringify(log.slice(-5000)));
}
