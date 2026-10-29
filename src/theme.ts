import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Brand: swap these for CoffeeOcean's exact colours
export const C = {
  ink: '#0b1722',
  deep: '#122333',
  tide: '#1f3b57',
  wave: '#2c6fb7',
  foam: '#f3f1ec',
  mist: '#8fa3b6',
  pumpkin: '#ff7a1a',
  pumpkinDeep: '#d95f08',
  fail: '#ff6b6b',
  paper: '#f6f4ef',
  line: 'rgba(243,241,236,0.12)',
};

export const F = {
  display: 'Unbounded_700Bold',
  displaySemi: 'Unbounded_600SemiBold',
  displayMedium: 'Unbounded_500Medium',
  body: 'Onest_400Regular',
  bodyMedium: 'Onest_500Medium',
  bodySemi: 'Onest_600SemiBold',
  mono: 'IBMPlexMono_400Regular',
  monoSemi: 'IBMPlexMono_600SemiBold',
};

/**
 * Layout unit: 1 at 820×1180 (iPad Air in portrait), scaled so every screen fits
 * the display without scrolling. `u(24)` is 24 points on that iPad.
 */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return useMemo(() => {
    const w = width - insets.left - insets.right;
    const h = height - insets.top - insets.bottom;
    const scale = Math.min(w / 820, h / 1180);
    const u = (n: number) => Math.round(n * scale * 100) / 100;
    return { u, scale, width, height, insets, colWidth: Math.min(w - 32, u(724)) };
  }, [width, height, insets]);
}

/** Font size that keeps a one-line heading inside `maxWidth` (Unbounded is wide). */
export function fitFont(text: string, maxWidth: number, base: number, ratio = 0.8) {
  const longest = Math.max(...text.split('\n').map(l => l.length), 1);
  return Math.min(base, maxWidth / (longest * ratio));
}
