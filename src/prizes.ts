import { CONFIG } from './config';
import { C } from './theme';

export type PrizeId = 'wish' | 'syrup' | 'candies' | 'voucher';

export const ORDER: PrizeId[] = ['wish', 'syrup', 'candies', 'voucher'];

/**
 * The prize is fixed by the receipt total, never random:
 * 0,00–25,99 wish · 26,00–40,99 syrup · 41,00–70,99 candies · 71,00+ voucher
 */
export function prizeFor(total: number): PrizeId {
  const t = CONFIG.tiers;
  if (total >= t.voucher) return 'voucher';
  if (total >= t.candies) return 'candies';
  if (total >= t.syrup) return 'syrup';
  return 'wish';
}

/** Upper bound of each tier, for the rules table. */
export function tierRange(id: PrizeId): [number, number | null] {
  const t = CONFIG.tiers;
  const next: Record<PrizeId, number | null> = { wish: t.syrup, syrup: t.candies, candies: t.voucher, voucher: null };
  return [t[id], next[id] == null ? null : (next[id] as number) - 0.01];
}

/** Eight slices on the wheel, two per prize. Slot i is centred at i × 45°. */
export const SLOTS: PrizeId[] = ['wish', 'syrup', 'candies', 'voucher', 'wish', 'syrup', 'candies', 'voucher'];

// Slice colours follow the brand palette: two ocean blues, foam, and pumpkin for the top prize
export const SLICE: Record<PrizeId, { fill: string; ink: string }> = {
  wish: { fill: C.tide, ink: C.foam },
  syrup: { fill: C.wave, ink: C.foam },
  candies: { fill: C.foam, ink: C.ink },
  voucher: { fill: C.pumpkin, ink: C.ink },
};

export function makePrizeCode() {
  const A = 'ACDEFHJKMNPRTUVWXY34679';
  let c = '';
  for (let i = 0; i < 4; i++) c += A[Math.floor(Math.random() * A.length)];
  return 'BOO-' + c;
}

export const money = (n: number) => n.toFixed(2).replace('.', ',') + ' zł';
const pad = (n: number) => String(n).padStart(2, '0');
export const dateStr = (d: Date) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
export const timeStr = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
