import { useCallback, useRef } from 'react';

import type { OcrBox } from '../receipt/parseReceipt';
import type { OcrEngine, OcrRead } from './types';

// Web preview only. ExecuTorch runs on iOS and Android, so in a browser the scanner
// "reads" sample receipts so every screen can be checked without an iPad.

const SAMPLES = [84.2, 18.5, 34, 56.9];

function box(text: string, x: number, y: number): OcrBox {
  const w = text.length * 14, h = 26;
  return { text, confidence: 0.95, quad: [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }] };
}

export function useOcrEngine(): OcrEngine {
  const n = useRef(0);
  const read = useCallback(async (): Promise<OcrRead> => {
    await new Promise(r => setTimeout(r, 900));
    const total = SAMPLES[n.current++ % SAMPLES.length];
    const today = new Date();
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const amount = total.toFixed(2).replace('.', ',');
    const detections = [
      box('COFFEEOCEAN', 120, 20), box(date, 20, 80), box(`nr wydr. ${1000 + n.current}${Date.now() % 1000}`, 300, 80),
      box('PARAGON FISKALNY', 140, 120), box('SUMA PLN', 20, 300), box(amount, 380, 300),
    ];
    return { detections, uri: '', width: 600, height: 800 };
  }, []);
  return { ready: true, progress: 100, error: null, read };
}
