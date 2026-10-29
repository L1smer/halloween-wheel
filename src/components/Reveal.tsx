import { useEffect, useMemo, useRef, useState } from 'react';
import { Text, View, type HostInstance } from 'react-native';
import Animated, {
  Easing, FadeInDown, interpolateColor, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue,
  withDelay, withRepeat, withSpring, withTiming, type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Line } from 'react-native-svg';

import type { PrizeId } from '../prizes';
import { SLICE } from '../prizes';
import { Sound } from '../sound';
import { C, F } from '../theme';
import { GhostIcon, PrizeIcon } from './Icons';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Heading whose letters drop in one after another. */
export function LetterTitle({ text, fontSize, delay = 500 }: { text: string; fontSize: number; delay?: number }) {
  let i = 0;
  const words = text.split(' ');
  return (
    <View accessible accessibilityRole="header" accessibilityLabel={text} style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
      {words.map((w, wi) => (
        <View key={`${text}-${wi}`} style={{ flexDirection: 'row', marginRight: wi < words.length - 1 ? fontSize * 0.3 : 0 }}>
          {[...w].map(ch => {
            const idx = i++;
            return (
              <Animated.Text
                key={idx}
                entering={FadeInDown.delay(delay + idx * 24).duration(600)}
                style={{ fontFamily: F.displaySemi, fontSize, lineHeight: fontSize * 1.12, color: C.foam }}
              >
                {ch}
              </Animated.Text>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function Ripple({ i, size, color }: { i: number; size: number; color: string }) {
  const r = useSharedValue(0);
  useEffect(() => { r.value = withDelay(350 + i * 400, withRepeat(withTiming(1, { duration: 2400, easing: Easing.out(Easing.quad) }), 2, false)); }, [i, r]);
  const style = useAnimatedStyle(() => ({ opacity: r.value > 0 && r.value < 1 ? 0.8 * (1 - r.value) : 0, transform: [{ scale: 0.95 + r.value * 0.5 }] }));
  return <Animated.View style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: color }, style]} />;
}

/** The prize badge: a disc in the prize's wheel colour that springs in, with ripples spreading out. */
export function Medal({ size, prize }: { size: number; prize: PrizeId }) {
  const reduced = useReducedMotion();
  const disc = useSharedValue(reduced ? 1 : 0), icon = useSharedValue(reduced ? 1 : 0), bob = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    disc.value = withDelay(150, withSpring(1, { damping: 9, stiffness: 120 }));
    icon.value = withDelay(450, withSpring(1, { damping: 8, stiffness: 110 }));
    bob.value = withDelay(1600, withRepeat(withTiming(1, { duration: 2250, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [disc, icon, bob, reduced]);
  const discStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, disc.value), transform: [{ scale: 0.6 + 0.4 * disc.value }] }));
  const iconStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, icon.value),
    transform: [{ translateY: (1 - icon.value) * size * 0.15 - bob.value * size * 0.02 }, { rotate: `${(1 - icon.value) * -8}deg` }, { scale: 0.6 + 0.4 * icon.value }],
  }));
  const { fill, ink } = SLICE[prize];
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {!reduced && [0, 1, 2].map(i => <Ripple key={i} i={i} size={size} color={fill} />)}
      <Animated.View style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: fill }, discStyle]} />
      <Animated.View style={iconStyle}>
        <PrizeIcon id={prize} size={size * 0.62} color={ink} />
      </Animated.View>
    </View>
  );
}

type Box = { x: number; y: number; w: number; h: number };

function WishLetter({ ch, start, time, fontSize, onLayout }: { ch: string; start: number; time: SharedValue<number>; fontSize: number; onLayout: (b: Box) => void }) {
  const style = useAnimatedStyle(() => {
    const p = Math.max(0, Math.min(1, (time.value - start) / 250));
    const c = Math.max(0, Math.min(1, (time.value - start) / 1400));
    return { opacity: p, transform: [{ translateY: (1 - p) * fontSize * 0.25 }], color: interpolateColor(c, [0, 1], ['#ff7a1a', '#f3f1ec']) };
  });
  return (
    <Animated.Text
      onLayout={e => { const l = e.nativeEvent.layout; onLayout({ x: l.x, y: l.y, w: l.width, h: l.height }); }}
      style={[{ fontFamily: F.bodyMedium, fontSize, lineHeight: fontSize * 1.25 }, style]}
    >
      {ch}
    </Animated.Text>
  );
}

/** Writes the wish letter by letter while a little ghost follows the pen, then floats away. */
export function WishWriter({ text, fontSize, width, onLetterBurst }: { text: string; fontSize: number; width: number; onLetterBurst: (x: number, y: number) => void }) {
  const reduced = useReducedMotion();
  const words = useMemo(() => text.split(' '), [text]);
  // When each letter appears, in ms. Spaces and punctuation add a pause.
  const { starts, end } = useMemo(() => {
    const out: number[] = [];
    let t = 0;
    words.forEach((w, wi) => {
      for (const ch of w) { out.push(t); t += /[.,!?]/.test(ch) ? 260 : 52; }
      if (wi < words.length - 1) t += 30;
    });
    return { starts: out, end: t };
  }, [words]);

  const time = useSharedValue(reduced ? 1e9 : -1);
  const xs = useSharedValue<number[]>([]), ys = useSharedValue<number[]>([]), hs = useSharedValue<number[]>([]);
  const ghostOn = useSharedValue(0), away = useSharedValue(0);
  const wordBoxes = useRef<Record<number, Box>>({});
  const letterBoxes = useRef<Record<number, { word: number; box: Box }>>({});
  const containerRef = useRef<HostInstance>(null);
  const [measured, setMeasured] = useState(false);
  const ghostW = fontSize * 1.05, ghostH = (ghostW * 70) / 60;

  const check = () => {
    if (measured) return;
    if (Object.keys(wordBoxes.current).length < words.length || Object.keys(letterBoxes.current).length < starts.length) return;
    const X: number[] = [], Y: number[] = [], H: number[] = [];
    for (let i = 0; i < starts.length; i++) {
      const l = letterBoxes.current[i], wb = wordBoxes.current[l.word];
      X.push(wb.x + l.box.x + l.box.w); Y.push(wb.y + l.box.y); H.push(l.box.h);
    }
    xs.value = X; ys.value = Y; hs.value = H;
    setMeasured(true);
  };

  useEffect(() => {
    if (!measured || reduced) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => {
      ghostOn.value = withTiming(0.9, { duration: 400 });
      time.value = withDelay(350, withTiming(end + 1400, { duration: end + 1400, easing: Easing.linear }));
      // A soft sparkle every few letters
      for (let i = 0; i < starts.length; i += 5) timers.push(setTimeout(() => Sound.shimmer(), 350 + starts[i]));
      timers.push(setTimeout(() => {
        away.value = withTiming(1, { duration: 1800, easing: Easing.out(Easing.cubic) });
        const last = starts.length - 1;
        containerRef.current?.measureInWindow((cx, cy) => onLetterBurst(cx + xs.value[last], cy + ys.value[last]));
      }, 350 + end + 400));
    }, 1300));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measured]);

  const ghostStyle = useAnimatedStyle(() => {
    const n = xs.value.length;
    if (!n) return { opacity: 0 };
    let k = 0;
    while (k < n - 1 && starts[k + 1] <= time.value) k++;
    const f = k < n - 1 ? Math.max(0, Math.min(1, (time.value - starts[k]) / (starts[k + 1] - starts[k]))) : 0;
    const nx = k < n - 1 ? xs.value[k + 1] : xs.value[k];
    const ny = k < n - 1 ? ys.value[k + 1] : ys.value[k];
    const x = xs.value[k] + (nx - xs.value[k]) * f;
    const y = ys.value[k] + (ny - ys.value[k]) * (ny === ys.value[k] ? f : f > 0.5 ? 1 : 0);
    return {
      opacity: ghostOn.value * (1 - away.value),
      transform: [
        { translateX: x + ghostW * 0.08 + away.value * 90 },
        { translateY: y + (hs.value[k] - ghostH) / 2 - away.value * 220 },
        { scale: 1 - away.value * 0.4 },
      ],
    };
  });

  let idx = 0;
  return (
    <View ref={containerRef} collapsable={false} style={{ width, position: 'relative' }} accessible accessibilityLabel={text}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
        {words.map((w, wi) => (
          <View
            key={wi}
            onLayout={e => { const l = e.nativeEvent.layout; wordBoxes.current[wi] = { x: l.x, y: l.y, w: l.width, h: l.height }; check(); }}
            style={{ flexDirection: 'row', marginRight: wi < words.length - 1 ? fontSize * 0.28 : 0 }}
          >
            {[...w].map(ch => {
              const i = idx++;
              return <WishLetter key={i} ch={ch} start={starts[i]} time={time} fontSize={fontSize} onLayout={b => { letterBoxes.current[i] = { word: wi, box: b }; check(); }} />;
            })}
          </View>
        ))}
      </View>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0 }, ghostStyle]}>
        <GhostIcon size={ghostW} color={C.foam} />
      </Animated.View>
    </View>
  );
}

/** Ring that empties over `seconds`, beside the "back to start" text. */
export function CountdownRing({ seconds, size }: { seconds: number; size: number }) {
  const p = useSharedValue(0);
  useEffect(() => { p.value = withTiming(1, { duration: seconds * 1000, easing: Easing.linear }); }, [p, seconds]);
  const L = 2 * Math.PI * 15;
  const props = useAnimatedProps(() => ({ strokeDashoffset: L * p.value }));
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle cx={18} cy={18} r={15} fill="none" stroke="rgba(243,241,236,0.15)" strokeWidth={3} />
      <AnimatedCircle cx={18} cy={18} r={15} fill="none" stroke={C.pumpkin} strokeWidth={3} strokeLinecap="round" strokeDasharray={`${L} ${L}`} animatedProps={props} />
    </Svg>
  );
}

export function Ticket({ fields, note, u }: { fields: { label: string; value: string; big?: boolean }[]; note: string; u: (n: number) => number }) {
  return (
    <View style={{ alignSelf: 'stretch', backgroundColor: C.paper, borderRadius: u(18), paddingVertical: u(22), paddingHorizontal: u(36), overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-end', columnGap: u(44), rowGap: u(6) }}>
        {fields.map(f => (
          <View key={f.label}>
            <Text style={{ fontFamily: F.bodySemi, fontSize: u(13), letterSpacing: u(13) * 0.14, textTransform: 'uppercase', color: '#6b7c8c' }}>{f.label}</Text>
            <Text style={{ fontFamily: f.big ? F.monoSemi : F.mono, fontSize: f.big ? u(36) : u(18), letterSpacing: f.big ? u(3.6) : 0, lineHeight: f.big ? u(40) : u(24), color: C.ink }}>{f.value}</Text>
          </View>
        ))}
      </View>
      {note ? (
        <>
          <Svg height={2} width="100%" style={{ marginTop: u(12) }}>
            <Line x1={0} y1={1} x2="100%" y2={1} stroke="rgba(11,23,34,0.25)" strokeWidth={1.5} strokeDasharray="5 5" />
          </Svg>
          <Text style={{ marginTop: u(12), fontFamily: F.bodyMedium, fontSize: u(20), textAlign: 'center', color: C.ink }}>{note}</Text>
        </>
      ) : null}
      {/* Ticket notches */}
      <View style={{ position: 'absolute', left: -u(12), top: '50%', marginTop: -u(12), width: u(24), height: u(24), borderRadius: u(12), backgroundColor: C.ink }} />
      <View style={{ position: 'absolute', right: -u(12), top: '50%', marginTop: -u(12), width: u(24), height: u(24), borderRadius: u(12), backgroundColor: C.ink }} />
    </View>
  );
}
