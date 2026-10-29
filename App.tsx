import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useFonts } from 'expo-font';
import { useKeepAwake } from 'expo-keep-awake';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Unbounded_500Medium } from '@expo-google-fonts/unbounded/500Medium';
import { Unbounded_600SemiBold } from '@expo-google-fonts/unbounded/600SemiBold';
import { Unbounded_700Bold } from '@expo-google-fonts/unbounded/700Bold';
import { Onest_400Regular } from '@expo-google-fonts/onest/400Regular';
import { Onest_500Medium } from '@expo-google-fonts/onest/500Medium';
import { Onest_600SemiBold } from '@expo-google-fonts/onest/600SemiBold';
import { IBMPlexMono_400Regular } from '@expo-google-fonts/ibm-plex-mono/400Regular';
import { IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono/600SemiBold';

import { BurstLayer, type BurstHandle } from './src/components/Burst';
import { TopBar } from './src/components/TopBar';
import { Background, WaveWipe, type WaveWipeHandle } from './src/components/Waves';
import { CONFIG, type Lang } from './src/config';
import { LanguageProvider, useI18n } from './src/i18n';
import { KioskContext, type Kiosk, type Receipt, type Screen, type Win } from './src/kiosk';
import { useOcrEngine } from './src/ocr/engine';
import { makePrizeCode, prizeFor } from './src/prizes';
import { logPrize, markReceiptUsed } from './src/receipt/store';
import { ResultScreen } from './src/screens/ResultScreen';
import { RulesScreen } from './src/screens/RulesScreen';
import { ScanScreen } from './src/screens/ScanScreen';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { WheelScreen } from './src/screens/WheelScreen';
import { Sound } from './src/sound';
import { C } from './src/theme';

// Keep the splash up until the fonts are in, so the first frame is already on brand
SplashScreen.preventAutoHideAsync().catch(() => {});

const SCREENS: Record<Screen, () => React.JSX.Element | null> = {
  welcome: WelcomeScreen,
  scan: ScanScreen,
  wheel: WheelScreen,
  result: ResultScreen,
  rules: RulesScreen,
};

function KioskApp() {
  useKeepAwake();
  const { t, resetLang, setLang } = useI18n();
  const ocr = useOcrEngine();
  const [screen, setScreen] = useState<Screen>('welcome');
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [win, setWin] = useState<Win | null>(null);
  const prev = useRef<Screen>('welcome');
  const lastTouch = useRef(Date.now());
  const busy = useRef(false);
  const wave = useRef<WaveWipeHandle>(null);
  const bursts = useRef<BurstHandle>(null);
  const receiptRef = useRef(receipt);
  receiptRef.current = receipt;
  const screenRef = useRef(screen);
  screenRef.current = screen;

  const go = useCallback((s: Screen) => {
    // A customer who has their prize is done: the next one starts in the café's language
    if (s === 'welcome' && screenRef.current === 'result') resetLang();
    if (screenRef.current !== s) prev.current = screenRef.current;
    setScreen(s);
    if (s === 'welcome') { setReceipt(null); setWin(null); }
  }, [resetLang]);

  const waveTo = useCallback((s: Screen) => {
    Sound.wave();
    if (wave.current) wave.current.play(() => go(s));
    else go(s);
  }, [go]);

  const back = useCallback(() => go(prev.current === 'rules' ? 'welcome' : prev.current), [go]);

  const issuePrize = useCallback((): Win | null => {
    const r = receiptRef.current;
    if (!r) return null;
    const w: Win = {
      prize: prizeFor(r.total),
      total: r.total,
      code: makePrizeCode(),
      issued: new Date(),
      wishIndex: Math.floor(Math.random() * t.wishes.length),
    };
    setWin(w);
    if (r.fingerprint) markReceiptUsed(r.fingerprint).catch(() => {});
    logPrize({ code: w.code, prize: w.prize, total: w.total, at: w.issued.toISOString(), receipt: r.fingerprint, typedByStaff: r.typedByStaff }).catch(() => {});
    return w;
  }, [t.wishes.length]);

  const burstAt = useCallback<Kiosk['burstAt']>((view, fx, fy, options) => {
    if (!view) { bursts.current?.fire(fx, fy, options); return; }
    view.measureInWindow((x, y, w, h) => bursts.current?.fire(x + w * fx, y + h * fy, options));
  }, []);

  // Back to the start, in the café's language, when nobody has touched the iPad for a while
  useEffect(() => {
    const id = setInterval(() => {
      if (busy.current || Date.now() - lastTouch.current < CONFIG.idleSeconds * 1000) return;
      // The result screen has its own countdown
      if (screenRef.current === 'welcome' || screenRef.current === 'result') return;
      go('welcome');
      resetLang();
    }, 5000);
    return () => clearInterval(id);
  }, [go, resetLang]);

  // Web preview only: open a screen straight away, e.g. ?screen=result&total=84.2&lang=pl
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search);
    const lang = q.get('lang') as Lang | null;
    if (lang === 'en' || lang === 'pl') setLang(lang);
    const s = q.get('screen') as Screen | null;
    const total = Number(q.get('total') ?? '84.2');
    if (s === 'wheel' || s === 'result') {
      const r = { total, fingerprint: null, typedByStaff: true };
      setReceipt(r);
      receiptRef.current = r;
      if (s === 'result') {
        const wish = Number(q.get('wish') ?? 0);
        setWin({ prize: prizeFor(total), total, code: 'BOO-7K3Q', issued: new Date(), wishIndex: wish });
      }
    }
    if (s && s in SCREENS) setScreen(s);
  }, [setLang]);

  const kiosk = useMemo<Kiosk>(
    () => ({ screen, go, waveTo, back, receipt, setReceipt, win, issuePrize, burstAt, busy, ocr }),
    [screen, go, waveTo, back, receipt, win, issuePrize, burstAt, ocr],
  );
  const Current = SCREENS[screen];

  return (
    <KioskContext.Provider value={kiosk}>
      <View style={styles.root} onTouchStart={() => { lastTouch.current = Date.now(); }}>
        <Background />
        {/* Own layer, so a screen fading out never draws over the wave */}
        <View style={StyleSheet.absoluteFill}>
          <Animated.View key={screen} entering={FadeIn.duration(500).delay(100)} exiting={FadeOut.duration(300)} style={StyleSheet.absoluteFill}>
            <Current />
          </Animated.View>
        </View>
        <TopBar />
        <BurstLayer ref={bursts} />
        <WaveWipe ref={wave} />
      </View>
    </KioskContext.Provider>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Unbounded_500Medium, Unbounded_600SemiBold, Unbounded_700Bold,
    Onest_400Regular, Onest_500Medium, Onest_600SemiBold,
    IBMPlexMono_400Regular, IBMPlexMono_600SemiBold,
  });
  useEffect(() => { Sound.init(); }, []);
  useEffect(() => { if (fontsLoaded) SplashScreen.hideAsync().catch(() => {}); }, [fontsLoaded]);

  return (
    <SafeAreaProvider style={{ backgroundColor: C.ink }}>
      <StatusBar hidden style="light" />
      {fontsLoaded ? (
        <LanguageProvider>
          <KioskApp />
        </LanguageProvider>
      ) : null}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.ink, overflow: 'hidden' },
});
