import { forwardRef, useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, { cancelAnimation, Easing, FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import type { Rect } from '../receipt/parseReceipt';
import { C, F, useLayout } from '../theme';
import { CameraFeed, type CameraFeedHandle } from './CameraFeed';

export type Snapshot = { uri: string; width: number; height: number; rect: Rect | null };
export type Tone = 'busy' | 'ok' | 'fail';

type Props = {
  width: number;
  height: number;
  /** The photo that was read, frozen with its total line outlined. */
  snapshot: Snapshot | null;
  reading: boolean;
  tone: Tone;
  status: string;
  guide: string;
  onCameraDenied: () => void;
};

function Corner({ pos, color, size }: { pos: 'tl' | 'tr' | 'bl' | 'br'; color: string; size: number }) {
  const b = 3, r = 12;
  const style = {
    position: 'absolute' as const, width: size, height: size, borderColor: color,
    ...(pos[0] === 't' ? { top: -7, borderTopWidth: b } : { bottom: -7, borderBottomWidth: b }),
    ...(pos[1] === 'l' ? { left: -7, borderLeftWidth: b } : { right: -7, borderRightWidth: b }),
    ...(pos === 'tl' ? { borderTopLeftRadius: r } : pos === 'tr' ? { borderTopRightRadius: r } : pos === 'bl' ? { borderBottomLeftRadius: r } : { borderBottomRightRadius: r }),
  };
  return <View style={style} />;
}

function Laser({ active, height }: { active: boolean; height: number }) {
  const y = useSharedValue(0);
  useEffect(() => {
    if (active) y.value = withRepeat(withTiming(1, { duration: 1150, easing: Easing.inOut(Easing.quad) }), -1, true);
    else { cancelAnimation(y); y.value = 0; }
  }, [active, y]);
  const style = useAnimatedStyle(() => ({ opacity: active ? 1 : 0, transform: [{ translateY: y.value * height }] }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', left: '-3%', right: '-3%', top: 0, height: 2, backgroundColor: C.foam, shadowColor: C.wave, shadowOpacity: 0.9, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } }, style]}
    />
  );
}

/** Camera window: live preview, guide frame, scanning line and the status pill (the only text on this screen). */
export const Viewfinder = forwardRef<CameraFeedHandle, Props>(function Viewfinder({ width, height, snapshot, reading, tone, status, guide, onCameraDenied }, ref) {
  const { u } = useLayout();
  // 3:4 window that fits the stage
  const h = Math.min(height, (width * 4) / 3), w = (h * 3) / 4;
  const box = { left: w * 0.12, top: h * 0.07, width: w * 0.76, height: h * 0.78 };
  const cornerColor = tone === 'fail' ? C.fail : snapshot ? C.pumpkin : 'rgba(243,241,236,0.85)';
  const [imgLoaded, setImgLoaded] = useState(false);
  useEffect(() => setImgLoaded(false), [snapshot?.uri]);

  // Where the read total sits on screen: the photo is shown like the preview, filling the window
  let mark: { left: number; top: number; width: number; height: number } | null = null;
  if (snapshot?.rect && snapshot.width && snapshot.height) {
    const s = Math.max(w / snapshot.width, h / snapshot.height);
    const ox = (w - snapshot.width * s) / 2, oy = (h - snapshot.height * s) / 2, r = snapshot.rect;
    mark = { left: ox + r.x * s - 6, top: oy + r.y * s - 5, width: r.width * s + 12, height: r.height * s + 10 };
  }

  return (
    <View style={{ width: w, height: h, borderRadius: u(30), overflow: 'hidden', backgroundColor: '#141f2b', borderWidth: 1, borderColor: C.line }}>
      <CameraFeed ref={ref} onDenied={onCameraDenied} />
      {snapshot?.uri ? (
        <Animated.View entering={FadeIn.duration(250)} style={StyleSheet.absoluteFill}>
          <Image source={{ uri: snapshot.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" onLoad={() => setImgLoaded(true)} />
          {mark && imgLoaded && (
            <Animated.View entering={FadeIn.duration(300)} style={{ position: 'absolute', ...mark, borderRadius: 6, borderWidth: 2.5, borderColor: C.pumpkin, backgroundColor: 'rgba(255,122,26,0.16)' }} />
          )}
        </Animated.View>
      ) : (
        <View pointerEvents="none" style={{ position: 'absolute', ...box, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(243,241,236,0.28)', borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: F.body, fontSize: Math.max(12, w * 0.034), color: 'rgba(243,241,236,0.55)' }}>{guide}</Text>
        </View>
      )}
      <View pointerEvents="none" style={{ position: 'absolute', ...box }}>
        <Corner pos="tl" color={cornerColor} size={box.width * 0.11} />
        <Corner pos="tr" color={cornerColor} size={box.width * 0.11} />
        <Corner pos="bl" color={cornerColor} size={box.width * 0.11} />
        <Corner pos="br" color={cornerColor} size={box.width * 0.11} />
        <Laser active={reading} height={box.height} />
      </View>
      <View style={{ position: 'absolute', bottom: h * 0.045, left: 0, right: 0, alignItems: 'center' }} accessibilityLiveRegion="polite">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: w * 0.02, backgroundColor: 'rgba(11,23,34,0.86)', borderWidth: 1, borderColor: C.line, borderRadius: 999, paddingVertical: w * 0.018, paddingHorizontal: w * 0.04 }}>
          <View style={{ width: w * 0.022, height: w * 0.022, borderRadius: w, backgroundColor: tone === 'ok' ? C.pumpkin : tone === 'fail' ? C.fail : C.mist }} />
          <Text style={{ fontFamily: F.bodyMedium, fontSize: Math.max(11, w * 0.032), color: tone === 'fail' ? '#ffc2c2' : C.foam }}>{status}</Text>
        </View>
      </View>
    </View>
  );
});
