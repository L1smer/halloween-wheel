import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';

import { C, F, useLayout } from '../theme';

type Base = { onPress?: () => void; disabled?: boolean; label?: string; style?: StyleProp<ViewStyle>; accessibilityLabel?: string };

/** A soft orange ring that breathes behind a button to say "tap me". */
function Pulse({ active, radius }: { active: boolean; radius: number }) {
  const { u } = useLayout();
  const p = useSharedValue(0);
  useEffect(() => {
    if (active) p.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }), -1, true);
    else { cancelAnimation(p); p.value = withTiming(0, { duration: 200 }); }
  }, [active, p]);
  const style = useAnimatedStyle(() => ({ opacity: p.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', top: -u(10), bottom: -u(10), left: -u(10), right: -u(10), borderRadius: radius, backgroundColor: 'rgba(255,122,26,0.13)' }, style]}
    />
  );
}

export function PrimaryButton({ onPress, disabled, label, icon, iconAfter, pulse, padX = 52, style, accessibilityLabel }: Base & { icon?: ReactNode; iconAfter?: ReactNode; pulse?: boolean; padX?: number }) {
  const { u } = useLayout();
  return (
    <View style={style}>
      <Pulse active={!!pulse && !disabled} radius={999} />
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: !!disabled }}
        style={({ pressed }) => [
          s.row,
          { minHeight: u(88), paddingHorizontal: u(padX), borderRadius: 999, gap: u(12), backgroundColor: disabled ? 'rgba(243,241,236,0.1)' : C.pumpkin },
          pressed && !disabled && { transform: [{ scale: 0.97 }] },
        ]}
      >
        {icon}
        {label ? <Text style={{ fontFamily: F.bodySemi, fontSize: u(28), color: disabled ? C.mist : C.ink }}>{label}</Text> : null}
        {iconAfter}
      </Pressable>
    </View>
  );
}

export function GhostButton({ onPress, label, icon, style }: Base & { icon?: ReactNode }) {
  const { u } = useLayout();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        s.row,
        { minHeight: u(88), paddingHorizontal: u(44), borderRadius: 999, gap: u(12), borderWidth: 1.5, borderColor: 'rgba(243,241,236,0.24)' },
        pressed && { transform: [{ scale: 0.97 }] },
        style,
      ]}
    >
      {icon}
      <Text style={{ fontFamily: F.bodySemi, fontSize: u(28), color: C.foam }}>{label}</Text>
    </Pressable>
  );
}

export function RoundButton({ onPress, children, accessibilityLabel, hidden }: Base & { children: ReactNode; hidden?: boolean }) {
  const { u } = useLayout();
  return (
    <Pressable
      onPress={onPress}
      disabled={hidden}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={hidden}
      style={({ pressed }) => [
        s.center,
        { width: u(88), height: u(88), borderRadius: u(44), borderWidth: 1.5, borderColor: 'rgba(243,241,236,0.2)', opacity: hidden ? 0 : 1 },
        pressed && { transform: [{ scale: 0.95 }] },
      ]}
    >
      {children}
    </Pressable>
  );
}

export function LinkButton({ onPress, label }: Base) {
  const { u } = useLayout();
  return (
    <Pressable onPress={onPress} accessibilityRole="link" hitSlop={12} style={{ paddingVertical: u(8), paddingHorizontal: u(6), minHeight: 40, justifyContent: 'center' }}>
      <Text style={{ fontFamily: F.body, fontSize: u(20), color: C.mist, textDecorationLine: 'underline', textDecorationColor: 'rgba(143,163,182,0.45)' }}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({ onPress, children, accessibilityLabel }: Base & { children: ReactNode }) {
  const { u } = useLayout();
  const size = Math.max(40, u(54));
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      style={({ pressed }) => [s.center, { width: size, height: size, borderRadius: size / 2, borderWidth: 1, borderColor: C.line }, pressed && { opacity: 0.6 }]}
    >
      {children}
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
});
