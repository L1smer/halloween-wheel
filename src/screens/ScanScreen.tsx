import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Text, View, type HostInstance } from 'react-native';

import { PrimaryButton, RoundButton } from '../components/Buttons';
import type { CameraFeedHandle } from '../components/CameraFeed';
import { UiIcon } from '../components/Icons';
import { Keypad } from '../components/Keypad';
import { Col, ScreenFrame, Stage } from '../components/Layout';
import { Viewfinder, type Snapshot, type Tone } from '../components/Viewfinder';
import { CONFIG } from '../config';
import { useI18n } from '../i18n';
import { useKiosk, wait } from '../kiosk';
import { money } from '../prizes';
import { parseReceipt, todayISO } from '../receipt/parseReceipt';
import { isReceiptUsed } from '../receipt/store';
import { Sound } from '../sound';
import { C, F, useLayout } from '../theme';

type StatusKey = 'preparing' | 'modelError' | 'noCamera' | 'looking' | 'hold' | 'reading' | 'checking' | 'ok' | 'unreadable' | 'used' | 'otherDay' | 'notOurs' | 'typed';
type Mode = 'wait' | 'ready' | 'retry';

/** Counts the total up from zero, like a till display. */
function useCountUp() {
  const [value, setValue] = useState<number | null>(null);
  const raf = useRef(0);
  const run = useCallback((to: number | null, ms = 650) => {
    cancelAnimationFrame(raf.current);
    if (to == null) { setValue(null); return; }
    const t0 = Date.now();
    const step = () => {
      const p = Math.min(1, (Date.now() - t0) / ms);
      setValue(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf.current = requestAnimationFrame(step);
      else setValue(to);
    };
    raf.current = requestAnimationFrame(step);
  }, []);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  return [value, run] as const;
}

export function ScanScreen() {
  const { t } = useI18n();
  const k = useKiosk();
  const { u } = useLayout();
  const camera = useRef<CameraFeedHandle>(null);
  const amountRef = useRef<HostInstance>(null);

  const [status, setStatus] = useState<{ key: StatusKey; tone: Tone }>({ key: 'looking', tone: 'busy' });
  const [mode, setMode] = useState<Mode>('wait');
  const [retryLabel, setRetryLabel] = useState<'retry' | 'another'>('retry');
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [reading, setReading] = useState(false);
  const [keypad, setKeypad] = useState(false);
  const [amount, countTo] = useCountUp();

  // The scan loop reads the latest engine state through a ref
  const ocrRef = useRef(k.ocr);
  ocrRef.current = k.ocr;
  const runId = useRef(0);
  const cameraDenied = useRef(false);

  const say = useCallback((key: StatusKey, tone: Tone = 'busy') => setStatus({ key, tone }), []);

  const accept = useCallback((total: number, fingerprint: string | null, typedByStaff: boolean) => {
    k.setReceipt({ total, fingerprint, typedByStaff });
    countTo(total);
    say(typedByStaff ? 'typed' : 'ok', 'ok');
    setMode('ready');
    AccessibilityInfo.announceForAccessibility(`${t.scan.totalLabel}: ${money(total)}`);
    setTimeout(() => k.burstAt(amountRef.current, 0.5, 0.5, { count: 24, speed: 220, gravity: 120 }), 120);
  }, [k, countTo, say, t]);

  const fail = useCallback((key: StatusKey, label: 'retry' | 'another') => {
    Sound.error();
    say(key, 'fail');
    setRetryLabel(label);
    setMode('retry');
  }, [say]);

  const start = useCallback(async () => {
    const id = ++runId.current;
    const alive = () => id === runId.current;
    setSnapshot(null); setReading(false); setMode('wait'); countTo(null);
    k.setReceipt(null);
    let attempts = 0;

    while (alive()) {
      const ocr = ocrRef.current;
      if (cameraDenied.current) { say('noCamera', 'fail'); return; }
      if (ocr.error) { say('modelError', 'fail'); return; }
      if (!ocr.ready) { say('preparing'); await wait(400); continue; }
      if (!camera.current?.isReady()) { say('looking'); await wait(300); continue; }

      say(attempts ? 'hold' : 'looking');
      await wait(attempts ? 400 : 900);
      if (!alive()) return;

      let read;
      try {
        const uri = await camera.current.capture();
        if (!alive()) return;
        setReading(true); say('reading');
        read = await ocr.read(uri);
      } catch {
        setReading(false);
        await wait(800);
        continue;
      }
      setReading(false);
      if (!alive()) return;

      const parsed = parseReceipt(read.detections);
      if (parsed.total == null) {
        // Text but no total: a receipt is there and could not be read. No text: keep looking.
        if (read.detections.length >= 3 && ++attempts >= CONFIG.maxReadAttempts) { fail('unreadable', 'retry'); return; }
        continue;
      }

      setSnapshot({ uri: read.uri, width: read.width, height: read.height, rect: parsed.totalRect });
      Sound.beep();
      say('checking');
      await wait(450);
      if (!alive()) return;

      if (CONFIG.requireSameDayReceipt && parsed.date && parsed.date !== todayISO()) { fail('otherDay', 'another'); return; }
      if (CONFIG.cafeNip && parsed.nip && parsed.nip !== CONFIG.cafeNip) { fail('notOurs', 'another'); return; }
      if (parsed.fingerprint && (await isReceiptUsed(parsed.fingerprint))) { fail('used', 'another'); return; }
      if (!alive()) return;
      accept(parsed.total, parsed.fingerprint, false);
      return;
    }
  }, [k, countTo, say, fail, accept]);

  useEffect(() => {
    start();
    return () => { runId.current++; };
    // Runs once when the scanner opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusText = status.key === 'preparing' ? t.scan.preparing(Math.round(k.ocr.progress)) : t.scan[status.key];

  return (
    <>
    <ScreenFrame>
      <Stage>
        {({ width, height }) => (
          <Viewfinder
            ref={camera}
            width={width}
            height={height}
            snapshot={snapshot}
            reading={reading}
            tone={status.tone}
            status={statusText}
            guide={t.scan.guide}
            onCameraDenied={() => { cameraDenied.current = true; }}
          />
        )}
      </Stage>
      <Col>
        <View ref={amountRef} collapsable={false} accessibilityLabel={t.scan.totalLabel}>
          <Text style={{ fontFamily: F.displaySemi, fontSize: u(64), lineHeight: u(64) * 1.1, letterSpacing: -u(1.3), fontVariant: ['tabular-nums'], color: amount == null ? 'rgba(243,241,236,0.18)' : C.pumpkin }}>
            {money(amount ?? 0)}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: u(16) }}>
          <RoundButton onPress={() => start()} accessibilityLabel={t.scan.rescan} hidden={mode === 'retry'}>
            <UiIcon name="rescan" size={u(32)} color={C.foam} strokeWidth={2} />
          </RoundButton>
          <PrimaryButton
            pulse={mode !== 'wait'}
            disabled={mode === 'wait'}
            label={mode === 'retry' ? (retryLabel === 'retry' ? t.scan.retry : t.scan.another) : t.scan.spin}
            iconAfter={mode === 'retry' ? undefined : <UiIcon name="arrow" size={u(28)} color={mode === 'wait' ? C.mist : C.ink} strokeWidth={2.4} />}
            onPress={() => (mode === 'retry' ? start() : k.go('wheel'))}
          />
          <RoundButton
            onPress={() => { runId.current++; setReading(false); setKeypad(true); }}
            accessibilityLabel={t.scan.keypad}
          >
            <UiIcon name="keypad" size={u(32)} color={C.foam} strokeWidth={2} />
          </RoundButton>
        </View>
      </Col>
    </ScreenFrame>
      {keypad && (
        <Keypad
          onCancel={() => { setKeypad(false); start(); }}
          onTotal={total => { setKeypad(false); setSnapshot(null); accept(total, null, true); }}
        />
      )}
    </>
  );
}
