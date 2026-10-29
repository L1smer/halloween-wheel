import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { C, useLayout } from '../theme';

/** A wave line `periods` long, one period every `period` px. */
function wavePath(period: number, periods: number, amp: number, mid: number) {
  let d = `M0 ${mid}`;
  for (let i = 0; i < periods; i++) {
    const x = i * period;
    d += ` C${x + period * 0.125} ${mid - amp} ${x + period * 0.375} ${mid - amp} ${x + period * 0.5} ${mid}`;
    d += ` S${x + period * 0.875} ${mid + amp} ${x + period} ${mid}`;
  }
  return d;
}

function DriftingLine({ width, period, bottom, opacity, duration, reverse }: { width: number; period: number; bottom: number; opacity: number; duration: number; reverse?: boolean }) {
  const reduced = useReducedMotion();
  const x = useSharedValue(0);
  const periods = Math.ceil(width / period) + 2;
  useEffect(() => {
    if (!reduced) x.value = withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false);
  }, [x, duration, reduced]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: (reverse ? x.value - 1 : -x.value) * period }] }));
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, bottom, width: periods * period, height: 24, opacity }, style]}>
      <Svg width={periods * period} height={24}>
        <Path d={wavePath(period, periods, 10, 12)} fill="none" stroke={C.foam} strokeWidth={1.5} />
      </Svg>
    </Animated.View>
  );
}

/** Night-ocean backdrop: a soft glow at the top and three thin waves drifting along the floor. */
export function Background() {
  const { width, height } = useLayout();
  const floor = height * 0.16;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: C.ink, overflow: 'hidden' }]}>
      <View style={{ position: 'absolute', left: -width * 0.4, right: -width * 0.4, top: -height * 0.35, height: height * 0.7, borderRadius: width, backgroundColor: '#17324d', opacity: 0.55 }} />
      <View style={{ position: 'absolute', left: -width * 0.2, right: -width * 0.2, top: -height * 0.25, height: height * 0.5, borderRadius: width, backgroundColor: '#17324d', opacity: 0.5 }} />
      <DriftingLine width={width} period={240} bottom={floor * 0.58} opacity={0.07} duration={7000} />
      <DriftingLine width={width} period={300} bottom={floor * 0.34} opacity={0.11} duration={6600} reverse />
      <DriftingLine width={width} period={200} bottom={floor * 0.1} opacity={0.16} duration={4200} />
    </View>
  );
}

export type WaveWipeHandle = { play: (onCovered: () => void) => void };

/** A wave rolls up over the screen, the screen changes underneath, and the wave drops away. */
export const WaveWipe = forwardRef<WaveWipeHandle>(function WaveWipe(_, ref) {
  const { width, height, u } = useLayout();
  const reduced = useReducedMotion();
  const y = useSharedValue(0);
  const [on, setOn] = useState(false);
  const crest = u(60) + 20;

  useImperativeHandle(ref, () => ({
    play(onCovered) {
      if (reduced) { onCovered(); return; }
      setOn(true);
      const ease = Easing.bezier(0.6, 0, 0.35, 1);
      y.value = 0;
      y.value = withSequence(
        withTiming(-(height + crest * 2 + 40), { duration: 675, easing: ease }),
        withDelay(150, withTiming(-(2 * height + crest * 4 + 80), { duration: 675, easing: ease })),
      );
      setTimeout(onCovered, 700);
      setTimeout(() => setOn(false), 1600);
    },
  }), [height, crest, reduced, y]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  if (!on) return null;
  const w = width * 1.1, period = w / 3;
  const top = wavePath(period, 3, crest * 0.5, crest * 0.5) + ` L${w} ${crest} L0 ${crest} Z`;
  const bottom = wavePath(period, 3, crest * 0.5, crest * 0.5) + ` L${w} 0 L0 0 Z`;
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: -width * 0.05, width: w, top: height + crest, height: height + crest * 2 + 40, backgroundColor: C.wave }, style]}>
      <Svg width={w} height={crest} style={{ position: 'absolute', top: -crest + 1, left: 0 }}><Path d={top} fill={C.wave} /></Svg>
      <Svg width={w} height={crest} style={{ position: 'absolute', bottom: -crest + 1, left: 0 }}><Path d={bottom} fill={C.wave} /></Svg>
    </Animated.View>
  );
});
