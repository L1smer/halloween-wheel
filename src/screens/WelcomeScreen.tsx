import { useEffect } from 'react';
import { Text } from 'react-native';
import Animated, { Easing, FadeInDown, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { PrimaryButton, LinkButton } from '../components/Buttons';
import { PumpkinIcon, UiIcon } from '../components/Icons';
import { Col, Lede, ScreenFrame, Stage } from '../components/Layout';
import { Wheel } from '../components/Wheel';
import { useI18n } from '../i18n';
import { useKiosk } from '../kiosk';
import { C, F, fitFont, useLayout } from '../theme';

const rise = (i: number) => FadeInDown.delay(120 + i * 80).duration(700);

export function WelcomeScreen() {
  const { t } = useI18n();
  const { go } = useKiosk();
  const { u, colWidth } = useLayout();
  const reduced = useReducedMotion();
  const rotation = useSharedValue(0);
  const lights = useSharedValue(0);

  // The teaser wheel turns slowly while the kiosk waits for a customer
  useEffect(() => {
    if (!reduced) rotation.value = withRepeat(withTiming(360, { duration: 90000, easing: Easing.linear }), -1, false);
  }, [rotation, reduced]);

  const hero = fitFont(`${t.welcome.titleTop}\n${t.welcome.titleBottom}`, colWidth, u(92), 0.82);
  const heroText = { fontFamily: F.display, fontSize: hero, lineHeight: hero * 1.02, letterSpacing: -hero * 0.03, textAlign: 'center' as const };

  return (
    <ScreenFrame>
      <Col>
        <Animated.View entering={rise(0)}>
          <Text accessibilityRole="header" style={[heroText, { color: C.foam }]}>
            {t.welcome.titleTop}
            {'\n'}
            <Text style={{ color: C.pumpkin }}>{t.welcome.titleBottom}</Text>
          </Text>
        </Animated.View>
        <Animated.View entering={rise(1)}>
          <Lede>{t.welcome.lede}</Lede>
        </Animated.View>
      </Col>
      <Stage>
        {({ width, height }) => {
          const size = Math.min(width * 0.92, height * 0.98);
          return (
            <Animated.View entering={rise(2)} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Wheel size={size} uid="t" labels={t.labels} rotation={rotation} lights={lights}>
                <HubBadge size={size * 0.27} />
              </Wheel>
            </Animated.View>
          );
        }}
      </Stage>
      <Col>
        <Animated.View entering={rise(3)}>
          <PrimaryButton pulse label={t.welcome.scan} onPress={() => go('scan')} icon={<UiIcon name="scan" size={u(28)} color={C.ink} />} />
        </Animated.View>
        <Animated.View entering={rise(4)}>
          <LinkButton label={t.welcome.rules} onPress={() => go('rules')} />
        </Animated.View>
      </Col>
    </ScreenFrame>
  );
}

export function HubBadge({ size }: { size: number }) {
  return (
    <Animated.View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.ink, borderWidth: 2, borderColor: 'rgba(243,241,236,0.16)', alignItems: 'center', justifyContent: 'center' }}>
      <PumpkinIcon size={size * 0.56} color={C.pumpkin} />
    </Animated.View>
  );
}
