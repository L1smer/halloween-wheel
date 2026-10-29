import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

// Small bursts of brand-coloured dots, fired when a total is read, the wheel lands or a prize appears.

export type BurstOptions = { count?: number; speed?: number; spread?: number; up?: boolean; gravity?: number; colors?: string[] };
export type BurstHandle = { fire: (x: number, y: number, options?: BurstOptions) => void };

type Particle = { vx: number; vy: number; life: number; r: number; color: string; g: number };
type BurstData = { id: number; x: number; y: number; parts: Particle[] };

const BRAND = ['#ff7a1a', '#f3f1ec', '#2c6fb7'];
const DRAG = 1.8;

function Dot({ p, t, x, y }: { p: Particle; t: SharedValue<number>; x: number; y: number }) {
  const style = useAnimatedStyle(() => {
    const tt = Math.min(t.value, p.life);
    // Motion with air drag and gravity, solved in closed form so each frame is independent
    const e = (1 - Math.exp(-DRAG * tt)) / DRAG;
    const px = p.vx * e, py = p.vy * e + p.g * (tt / DRAG - e / DRAG);
    const k = tt / p.life;
    return { opacity: 1 - k, transform: [{ translateX: x + px - p.r }, { translateY: y + py - p.r }, { scale: 1 - 0.5 * k }] };
  });
  return <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: p.r * 2, height: p.r * 2, borderRadius: p.r, backgroundColor: p.color }, style]} />;
}

function Burst({ data }: { data: BurstData }) {
  const t = useSharedValue(0);
  useEffect(() => { t.value = withTiming(2, { duration: 2000, easing: Easing.linear }); }, [t]);
  return <>{data.parts.map((p, i) => <Dot key={i} p={p} t={t} x={data.x} y={data.y} />)}</>;
}

export const BurstLayer = forwardRef<BurstHandle>(function BurstLayer(_, ref) {
  const reduced = useReducedMotion();
  const [bursts, setBursts] = useState<BurstData[]>([]);
  const seq = useRef(0);

  useImperativeHandle(ref, () => ({
    fire(x, y, o = {}) {
      if (reduced) return;
      const n = o.count ?? 50, colors = o.colors ?? BRAND;
      const parts: Particle[] = Array.from({ length: n }, (_, i) => {
        const ang = (o.up ? -Math.PI / 2 : 0) + (Math.random() - 0.5) * (o.spread ?? Math.PI * 2);
        const sp = (o.speed ?? 380) * (0.35 + Math.random() * 0.75);
        return { vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 0.8 + Math.random(), r: 2 + Math.random() * 3, color: colors[i % colors.length], g: o.gravity ?? 260 };
      });
      const id = ++seq.current;
      setBursts(b => [...b, { id, x, y, parts }]);
      setTimeout(() => setBursts(b => b.filter(q => q.id !== id)), 2100);
    },
  }), [reduced]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {bursts.map(b => <Burst key={b.id} data={b} />)}
    </View>
  );
});
