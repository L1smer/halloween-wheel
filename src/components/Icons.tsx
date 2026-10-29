import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import type { PrizeId } from '../prizes';

// Line icons drawn on a 48×48 grid. The *Glyph parts can be placed inside a larger SVG (the wheel).

type GlyphProps = { color: string; strokeWidth?: number };
const line = (color: string, strokeWidth = 2.6) =>
  ({ fill: 'none', stroke: color, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round' }) as const;

export function PrizeGlyph({ id, color, strokeWidth }: GlyphProps & { id: PrizeId }) {
  const s = line(color, strokeWidth);
  switch (id) {
    case 'wish':
      return (
        <G {...s}>
          <Path d="M27 9a16 16 0 1 0 12 25A13 13 0 0 1 27 9z" />
          <Path d="M38 5v8M34 9h8" />
        </G>
      );
    case 'syrup':
      return (
        <G {...s}>
          <Path d="M30 8H18.5l-3 3M24 8v6" />
          <Path d="M20 14h8v4h-8z" />
          <Rect x={14} y={18} width={20} height={24} rx={6} />
          <Path d="M24 24.5c-2.4 3-3.6 4.8-3.6 6.4a3.6 3.6 0 0 0 7.2 0c0-1.6-1.2-3.4-3.6-6.4z" />
        </G>
      );
    case 'candies':
      return (
        <G {...s} transform="rotate(-32 24 24)">
          <Circle cx={24} cy={24} r={8} />
          <Path d="M16.5 21.5 9 17v14l7.5-4.5M31.5 21.5 39 17v14l-7.5-4.5" />
          <Path d="M20.4 21.6a4.6 4.6 0 0 1 3.2-2" />
        </G>
      );
    case 'voucher':
      return (
        <G {...s}>
          <Path d="M13 14h22M15.6 14l1.3-4.5h14.2l1.3 4.5" />
          <Path d="M15.6 14l2.6 28h11.6l2.6-28" />
          <Path d="M16.9 22h14.2M17.9 33h12.2" />
        </G>
      );
  }
}

export function PumpkinGlyph({ color, strokeWidth }: GlyphProps) {
  return (
    <G {...line(color, strokeWidth)}>
      <Path d="M24 15c-7 0-15 3-15 12.5S17 40 24 40s15-3 15-12.5S31 15 24 15z" />
      <Path d="M24 15c-4.5 3-6 8-6 12.5s1.5 9.5 6 12.5M24 15c4.5 3 6 8 6 12.5s-1.5 9.5-6 12.5" />
      <Path d="M24 15c0-3 1-6 4-7" />
    </G>
  );
}

type IconProps = { size: number; color: string };

export function PrizeIcon({ id, size, color }: IconProps & { id: PrizeId }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <PrizeGlyph id={id} color={color} />
    </Svg>
  );
}

export function PumpkinIcon({ size, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <PumpkinGlyph color={color} />
    </Svg>
  );
}

export function WaveMark({ size, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <G fill="none" stroke={color} strokeWidth={3} strokeLinecap="round">
        <Path d="M4 20c4 0 4-4 8-4s4 4 8 4 4-4 8-4 4 4 8 4 4-4 8-4" />
        <Path d="M4 31c4 0 4-4 8-4s4 4 8 4 4-4 8-4 4 4 8 4 4-4 8-4" />
      </G>
    </Svg>
  );
}

export function GhostIcon({ size, color }: IconProps) {
  return (
    <Svg width={size} height={(size * 70) / 60} viewBox="0 0 60 70">
      <G fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M10 64V31a20 20 0 0 1 40 0v33l-6.5-5.5L37 64l-7-5.5-7 5.5-6.5-5.5z" />
        <Path d="M26.5 42q3.5 3 7 0" />
      </G>
      <Circle cx={23} cy={31} r={2.6} fill={color} />
      <Circle cx={37} cy={31} r={2.6} fill={color} />
    </Svg>
  );
}

// 24×24 interface icons
type UiName = 'home' | 'soundOn' | 'soundOff' | 'scan' | 'arrow' | 'back' | 'rescan' | 'keypad' | 'spin' | 'delete';
const UI: Record<UiName, string> = {
  home: 'M3 11.5 12 4l9 7.5M5.5 10v10h13V10M10 20v-5.5h4V20',
  soundOn: 'M11 5 6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13',
  soundOff: 'M11 5 6 9H3v6h3l5 4zM16 9l6 6M22 9l-6 6',
  scan: 'M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M8 8h8M8 12h8M8 16h5',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  back: 'M19 12H5M11 6l-6 6 6 6',
  rescan: 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5',
  keypad: 'M4.5 6h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zM6 10h.01M9.5 10h.01M13 10h.01M16.5 10h.01M7.5 14h9',
  spin: 'M21 12a9 9 0 1 1-3-6.7M21 4v5h-5',
  delete: 'M21 5H9l-6 7 6 7h12zM17 9l-5 6M12 9l5 6',
};

export function UiIcon({ name, size, color, strokeWidth = 2.2 }: IconProps & { name: UiName; strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={UI[name]} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
