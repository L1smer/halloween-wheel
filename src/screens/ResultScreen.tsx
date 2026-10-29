import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Text, View, type HostInstance } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PrimaryButton } from '../components/Buttons';
import { Col, Eyebrow, Lede, ScreenFrame, Stage } from '../components/Layout';
import { CountdownRing, LetterTitle, Medal, Ticket, WishWriter } from '../components/Reveal';
import { CONFIG } from '../config';
import { useI18n } from '../i18n';
import { useKiosk } from '../kiosk';
import { dateStr, money, timeStr } from '../prizes';
import { Sound } from '../sound';
import { C, F, fitFont, useLayout } from '../theme';

// Items under the title arrive in sequence after the badge
const after = (d: number) => FadeInDown.delay(950 + d * 110).duration(600);

export function ResultScreen() {
  const { t } = useI18n();
  const k = useKiosk();
  const { u, colWidth } = useLayout();
  const medalRef = useRef<HostInstance>(null);
  const [left, setLeft] = useState(CONFIG.resultSeconds);
  const win = k.win;

  useEffect(() => {
    if (!win) { k.go('welcome'); return; }
    const p = t.prizes[win.prize];
    AccessibilityInfo.announceForAccessibility(t.result.announce(p.name) + (win.prize === 'wish' ? ' ' + t.wishes[win.wishIndex] : ''));
    const reveal = setTimeout(() => {
      Sound.reveal();
      if (win.prize !== 'wish') k.burstAt(medalRef.current, 0.5, 0.5, { count: 70, speed: 520, gravity: 160 });
    }, 520);
    const started = Date.now();
    const timer = setInterval(() => {
      const s = CONFIG.resultSeconds - Math.floor((Date.now() - started) / 1000);
      setLeft(Math.max(0, s));
      if (s <= 0) { clearInterval(timer); k.go('welcome'); }
    }, 1000);
    return () => { clearTimeout(reveal); clearInterval(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!win) return null;
  const p = t.prizes[win.prize];
  const isWish = win.prize === 'wish';
  const valid = new Date(win.issued);
  valid.setDate(valid.getDate() + CONFIG.voucherValidDays);
  const fields = [
    { label: t.result.code, value: win.code, big: true },
    { label: t.result.issued, value: `${dateStr(win.issued)} · ${timeStr(win.issued)}` },
    ...(win.prize === 'voucher' ? [{ label: t.result.valid, value: dateStr(valid) }] : []),
  ];

  return (
    <ScreenFrame>
      <Stage>
        {({ width, height }) =>
          isWish ? (
            <WishWriter
              text={t.wishes[win.wishIndex]}
              fontSize={Math.min(u(52), height / 5.2)}
              width={Math.min(width, u(700))}
              onLetterBurst={(x, y) => k.burstAt(null, x, y, { count: 20, speed: 160, gravity: -40, colors: ['#ff7a1a', '#f3f1ec'] })}
            />
          ) : (
            <View ref={medalRef} collapsable={false}>
              <Medal size={Math.min(width * 0.64, height * 0.74)} prize={win.prize} />
            </View>
          )
        }
      </Stage>
      <Col>
        <Animated.View entering={after(-3)}>
          <Eyebrow>
            {t.result.eyebrow} <Text style={{ color: C.foam }}>{money(win.total)}</Text>
          </Eyebrow>
        </Animated.View>
        <LetterTitle text={p.title} fontSize={fitFont(p.title, colWidth * 1.9, u(54), 0.78)} />
        <Animated.View entering={after(0)}>
          <Lede>{p.lede}</Lede>
        </Animated.View>
        {!isWish && (
          <Animated.View entering={FadeInDown.delay(1250).duration(600)} style={{ alignSelf: 'stretch' }}>
            <Ticket fields={fields} note={p.note} u={u} />
          </Animated.View>
        )}
        {p.upsell ? (
          <Animated.View entering={after(2)}>
            <Text style={{ fontFamily: F.body, fontSize: u(19), color: C.mist, textAlign: 'center' }}>{p.upsell}</Text>
          </Animated.View>
        ) : null}
        <Animated.View entering={after(3)} style={{ flexDirection: 'row', alignItems: 'center', gap: u(16) }}>
          <PrimaryButton label={t.result.done} onPress={() => k.go('welcome')} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: u(10) }}>
            <CountdownRing seconds={CONFIG.resultSeconds} size={u(36)} />
            <Text style={{ fontFamily: F.body, fontSize: u(17), color: C.mist }}>{t.result.backIn(left)}</Text>
          </View>
        </Animated.View>
      </Col>
    </ScreenFrame>
  );
}
