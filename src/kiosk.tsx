import { createContext, useContext, type MutableRefObject } from 'react';
import type { HostInstance } from 'react-native';

import type { BurstOptions } from './components/Burst';
import type { OcrEngine } from './ocr/types';
import type { PrizeId } from './prizes';

export type Screen = 'welcome' | 'scan' | 'wheel' | 'result' | 'rules';

export type Receipt = { total: number; fingerprint: string | null; typedByStaff: boolean };
export type Win = { prize: PrizeId; total: number; code: string; issued: Date; wishIndex: number };

export type Kiosk = {
  screen: Screen;
  go: (s: Screen) => void;
  /** Changes screen behind a rolling wave. */
  waveTo: (s: Screen) => void;
  /** Leaves the rules for wherever the customer came from. */
  back: () => void;
  receipt: Receipt | null;
  setReceipt: (r: Receipt | null) => void;
  win: Win | null;
  /** Fixes the prize for the current receipt and spends the receipt. */
  issuePrize: () => Win | null;
  burstAt: (view: HostInstance | null, fx: number, fy: number, options?: BurstOptions) => void;
  /** True while the wheel turns, so the idle timer leaves it alone. */
  busy: MutableRefObject<boolean>;
  ocr: OcrEngine;
};

export const KioskContext = createContext<Kiosk | null>(null);

export function useKiosk() {
  const k = useContext(KioskContext);
  if (!k) throw new Error('useKiosk must be used inside the kiosk');
  return k;
}

export const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
