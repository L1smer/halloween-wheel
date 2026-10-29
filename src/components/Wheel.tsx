import { memo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedProps, useAnimatedStyle, useFrameCallback, useSharedValue, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, G, Path, Text as SvgText, TextPath } from 'react-native-svg';

import { SLICE, SLOTS, type PrizeId } from '../prizes';
import { C, F } from '../theme';
import { PrizeGlyph } from './Icons';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Lights mode: 0 idle (alternating), 1 chasing with the spin, 2 flashing on a win. */
export type LightsMode = 0 | 1 | 2;

function pt(r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [+(r * Math.sin(a)).toFixed(2), +(-r * Math.cos(a)).toFixed(2)];
}
function slicePath(r: number, a0: number, a1: number) {
  const [x0, y0] = pt(r, a0), [x1, y1] = pt(r, a1);
  return `M0 0 L${x0} ${y0} A${r} ${r} 0 0 1 ${x1} ${y1} Z`;
}

function Bulb({ i, rotation, lights, clock }: { i: number; rotation: SharedValue<number>; lights: SharedValue<number>; clock: SharedValue<number> }) {
  const [x, y] = pt(186, i * 15 + 7.5);
  const props = useAnimatedProps(() => {
    let on: boolean;
    if (lights.value === 2) on = Math.floor(clock.value / 130) % 2 === 0;
    else if (lights.value === 1) on = ((((i + Math.floor(rotation.value / 15)) % 4) + 4) % 4) < 2;
    else on = (i + Math.floor(clock.value / 520)) % 2 === 0;
    return { fill: on ? '#ff7a1a' : 'rgba(243,241,236,0.26)' };
  });
  return <AnimatedCircle cx={x} cy={y} r={3.4} animatedProps={props} />;
}

function Dim({ i, d, dim, win }: { i: number; d: string; dim: SharedValue<number>; win: boolean }) {
  const props = useAnimatedProps(() => ({ opacity: win ? 0 : dim.value * 0.62 }));
  return <AnimatedPath key={i} d={d} fill={C.ink} animatedProps={props} />;
}

// The slices, labels and icons never change between frames, so they render once
const Face = memo(function Face({ uid, labels, dim, winSlot }: { uid: string; labels: Record<PrizeId, string>; dim?: SharedValue<number>; winSlot?: number | null }) {
  return (
    <Svg width="100%" height="100%" viewBox="-170 -170 340 340">
      <Defs>
        {SLOTS.map((_, i) => {
          const c = i * 45, [x0, y0] = pt(136, c - 21), [x1, y1] = pt(136, c + 21);
          return <Path key={i} id={`arc${i}${uid}`} d={`M${x0} ${y0} A136 136 0 0 1 ${x1} ${y1}`} />;
        })}
      </Defs>
      {SLOTS.map((id, i) => <Path key={i} d={slicePath(170, i * 45 - 22.5, i * 45 + 22.5)} fill={SLICE[id].fill} />)}
      {SLOTS.map((id, i) => {
        const label = labels[id];
        // Long words (Polish) get a slightly smaller size so they fit the slice
        const fs = Math.min(15, 96 / (label.length * 0.86));
        return (
          <G key={i}>
            <G transform={`rotate(${i * 45}) translate(-21 -115)`}>
              <G transform="scale(0.875)">
                <PrizeGlyph id={id} color={SLICE[id].ink} />
              </G>
            </G>
            <SvgText fill={SLICE[id].ink} fontFamily={F.displaySemi} fontSize={fs} letterSpacing={fs * 0.16} textAnchor="middle">
              <TextPath href={`#arc${i}${uid}`} startOffset="50%">{label}</TextPath>
            </SvgText>
            <Path d="M0 -58 L0 -170" transform={`rotate(${i * 45 - 22.5})`} stroke={C.ink} strokeWidth={2.5} />
          </G>
        );
      })}
      {dim && SLOTS.map((_, i) => <Dim key={i} i={i} d={slicePath(170, i * 45 - 22.5, i * 45 + 22.5)} dim={dim} win={winSlot === i} />)}
    </Svg>
  );
});

type Props = {
  size: number;
  uid: string;
  labels: Record<PrizeId, string>;
  rotation: SharedValue<number>;
  lights: SharedValue<number>;
  pointer?: SharedValue<number>;
  dim?: SharedValue<number>;
  winSlot?: number | null;
  /** The hub in the middle: a button on the wheel screen, a badge on the welcome screen. */
  children?: ReactNode;
};

export function Wheel({ size, uid, labels, rotation, lights, pointer, dim, winSlot, children }: Props) {
  const clock = useSharedValue(0);
  useFrameCallback(f => { clock.value = f.timeSinceFirstFrame; });

  const faceStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));
  const pointerStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${pointer ? pointer.value : 0}deg` }] }));
  const inset = (size * 40) / 420;

  return (
    <View style={{ width: size, height: size }}>
      <Svg style={StyleSheet.absoluteFill} viewBox="-210 -210 420 420">
        <Circle r={186} fill="none" stroke={C.deep} strokeWidth={30} />
        <Circle r={201} fill="none" stroke="rgba(243,241,236,0.14)" strokeWidth={1.5} />
        {Array.from({ length: 24 }, (_, i) => <Bulb key={i} i={i} rotation={rotation} lights={lights} clock={clock} />)}
      </Svg>
      <Animated.View style={[{ position: 'absolute', left: inset, top: inset, width: size - 2 * inset, height: size - 2 * inset }, faceStyle]}>
        <Face uid={uid} labels={labels} dim={dim} winSlot={winSlot} />
      </Animated.View>
      {/* Pointer: a pumpkin-orange drop on a pin at the top of the rim */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { transformOrigin: '50% 3.333%' }, pointerStyle]}>
        <Svg width="100%" height="100%" viewBox="-210 -210 420 420">
          <Path d="M0 -158 L-12.5 -189 A14 14 0 1 1 12.5 -189 Z" fill={C.pumpkin} stroke={C.ink} strokeWidth={3} strokeLinejoin="round" />
          <Circle cx={0} cy={-196} r={4.2} fill={C.ink} />
        </Svg>
      </Animated.View>
      <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        {children}
      </View>
    </View>
  );
}
