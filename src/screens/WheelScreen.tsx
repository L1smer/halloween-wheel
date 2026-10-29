import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, View, type HostInstance } from 'react-native';
import Animated, {
  Easing, useAnimatedReaction, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { PrimaryButton } from '../components/Buttons';
import { PumpkinIcon, UiIcon } from '../components/Icons';
import { Col, ScreenFrame, Stage } from '../components/Layout';
import { Wheel } from '../components/Wheel';
import { useI18n } from '../i18n';
import { useKiosk, type Win } from '../kiosk';
import { SLOTS } from '../prizes';
import { Sound } from '../sound';
import { C, useLayout } from '../theme';

const mod = (a: number, n: number) => ((a % n) + n) % n;

function Hub({ size, disabled, spinning, onPress, label }: { size: number; disabled: boolean; spinning: boolean; onPress: () => void; label: string }) {
  const ring = useSharedValue(0);
  useEffect(() => {
    ring.value = disabled ? withTiming(0) : withRepeat(withTiming(1, { duration: 2600, easing: Easing.out(Easing.quad) }), -1, false);
  }, [disabled, ring]);
  const ringStyle = useAnimatedStyle(() => ({ opacity: disabled ? 0 : 0.9 * (1 - ring.value), transform: [{ scale: 0.94 + ring.value * 0.28 }] }));
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: C.ink,
        borderWidth: 2, borderColor: spinning ? C.pumpkin : 'rgba(243,241,236,0.16)', transform: [{ scale: pressed ? 0.94 : 1 }],
      })}
    >
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: -size * 0.08, left: -size * 0.08, right: -size * 0.08, bottom: -size * 0.08, borderRadius: size, borderWidth: 1.5, borderColor: 'rgba(255,122,26,0.5)' }, ringStyle]} />
      <PumpkinIcon size={size * 0.56} color={C.pumpkin} />
    </Pressable>
  );
}

export function WheelScreen() {
  const { t } = useI18n();
  const k = useKiosk();
  const { u } = useLayout();
  const reduced = useReducedMotion();
  const wheelRef = useRef<HostInstance>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const winRef = useRef<Win | null>(null);

  const rotation = useSharedValue(0);
  const pointer = useSharedValue(0);
  const lights = useSharedValue(0);
  const dim = useSharedValue(0);
  const [phase, setPhase] = useState<'ready' | 'spinning' | 'landed'>('ready');
  const [winSlot, setWinSlot] = useState<number | null>(null);

  useEffect(() => {
    if (!k.receipt) k.go('scan');
    return () => { timers.current.forEach(clearTimeout); k.busy.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tick = () => Sound.tick(0.8);

  // Each slice edge that passes the pointer flicks it and clicks
  useAnimatedReaction(
    () => Math.floor((rotation.value + 22.5) / 45),
    (cur, prev) => {
      if (prev === null || cur === prev) return;
      pointer.value = withSequence(withTiming(-20, { duration: 40 }), withSpring(0, { damping: 7, stiffness: 240 }));
      scheduleOnRN(tick);
    },
  );

  const landed = (slot: number) => {
    const win = winRef.current;
    setPhase('landed');
    setWinSlot(slot);
    dim.value = withTiming(1, { duration: 500 });
    lights.value = 2;
    k.busy.current = false;
    Sound.win();
    if (win) AccessibilityInfo.announceForAccessibility(t.wheel.stopped(t.prizes[win.prize].name));
    k.burstAt(wheelRef.current, 0.5, 0.04, { count: 60, speed: 460, up: true, spread: Math.PI * 1.2 });
    timers.current.push(setTimeout(() => { lights.value = 0; }, 2000));
    timers.current.push(setTimeout(() => k.waveTo('result'), reduced ? 1200 : 2400));
  };

  const spin = () => {
    if (phase !== 'ready') return;
    const win = k.issuePrize();
    if (!win) { k.go('scan'); return; }
    winRef.current = win;
    k.busy.current = true;
    setPhase('spinning');
    lights.value = 1;
    Sound.whoosh();
    AccessibilityInfo.announceForAccessibility(t.wheel.spinning);

    // Land on a slot that shows the prize this total has earned (two slots per prize)
    const slots = SLOTS.map((p, i) => (p === win.prize ? i : -1)).filter(i => i >= 0);
    const slot = slots[Math.floor(Math.random() * slots.length)];
    const target = mod(-slot * 45 + (Math.random() * 2 - 1) * 15, 360);
    const start = rotation.value;
    const final = start + (reduced ? 2 : 6) * 360 + mod(target - mod(start, 360), 360);
    const total = reduced ? 2400 : 7400, wind = reduced ? 1 : 420, settle = reduced ? 1 : 650;
    rotation.value = withSequence(
      // A small pull back, the long spin with an overshoot, then it settles
      withTiming(start - (reduced ? 0 : 14), { duration: wind, easing: Easing.inOut(Easing.sin) }),
      withTiming(final + (reduced ? 0 : 4), { duration: total - wind - settle, easing: Easing.bezier(0.22, 0.04, 0.05, 1) }),
      withTiming(final, { duration: settle, easing: Easing.inOut(Easing.sin) }, finished => {
        if (finished) scheduleOnRN(landed, slot);
      }),
    );
  };

  return (
    <ScreenFrame>
      <Stage>
        {({ width, height }) => {
          const size = Math.min(width, height);
          return (
            <View ref={wheelRef} collapsable={false}>
              <Wheel size={size} uid="m" labels={t.labels} rotation={rotation} lights={lights} pointer={pointer} dim={dim} winSlot={winSlot}>
                <Hub size={size * 0.27} disabled={phase !== 'ready'} spinning={phase === 'spinning'} onPress={spin} label={t.wheel.spin} />
              </Wheel>
            </View>
          );
        }}
      </Stage>
      <Col>
        <PrimaryButton
          pulse={phase === 'ready'}
          disabled={phase !== 'ready'}
          label={t.wheel.spin}
          onPress={spin}
          icon={<UiIcon name="spin" size={u(28)} color={phase === 'ready' ? C.ink : C.mist} strokeWidth={2.3} />}
        />
      </Col>
    </ScreenFrame>
  );
}
