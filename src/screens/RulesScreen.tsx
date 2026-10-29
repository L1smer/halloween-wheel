import { Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { GhostButton, PrimaryButton } from '../components/Buttons';
import { PrizeIcon, UiIcon } from '../components/Icons';
import { Eyebrow, Lede, ScreenFrame, Title } from '../components/Layout';
import { CONFIG } from '../config';
import { useI18n } from '../i18n';
import { useKiosk } from '../kiosk';
import { ORDER, SLICE, tierRange } from '../prizes';
import { C, F, useLayout } from '../theme';

const rise = (i: number) => FadeInDown.delay(120 + i * 80).duration(700);
const amount = (n: number) => n.toFixed(2).replace('.', ',');

/** Fills {key} from CONFIG.legal; anything not set yet shows as a highlighted placeholder. */
function Clause({ text, size }: { text: string; size: number }) {
  const { t } = useI18n();
  const parts = text.split(/(\{\w+\})/);
  return (
    <>
      {parts.map((part, i) => {
        const m = /^\{(\w+)\}$/.exec(part);
        if (!m) return part;
        const key = m[1] as keyof typeof CONFIG.legal;
        const value = CONFIG.legal[key];
        if (value) return value;
        return (
          <Text key={i} style={{ fontFamily: F.mono, fontSize: size * 0.86, color: C.foam, backgroundColor: 'rgba(44,111,183,0.28)' }}>
            {' '}{t.rules.ph[key]}{' '}
          </Text>
        );
      })}
    </>
  );
}

export function RulesScreen() {
  const { t } = useI18n();
  const { back, go } = useKiosk();
  const { u, colWidth } = useLayout();
  const half = (colWidth - u(32)) / 2;

  return (
    <ScreenFrame>
      <View style={{ width: colWidth, flex: 1, justifyContent: 'center', gap: u(26) }}>
        <Animated.View entering={rise(0)} style={{ gap: u(12) }}>
          <Eyebrow style={{ textAlign: 'left' }}>{t.rules.eyebrow}</Eyebrow>
          <Title style={{ textAlign: 'left' }}>{t.rules.title}</Title>
          <Lede style={{ textAlign: 'left', fontSize: u(22), lineHeight: u(22) * 1.4, maxWidth: undefined }}>{t.rules.lede}</Lede>
        </Animated.View>

        <Animated.View entering={rise(1)} style={{ borderTopWidth: 1, borderColor: C.line }}>
          {ORDER.map(id => {
            const [lo, hi] = tierRange(id);
            const p = t.prizes[id];
            return (
              <View key={id} style={{ flexDirection: 'row', alignItems: 'center', gap: u(18), paddingVertical: u(14), borderBottomWidth: 1, borderColor: C.line }}>
                <View style={{ width: u(52), height: u(52), borderRadius: u(26), backgroundColor: SLICE[id].fill, alignItems: 'center', justifyContent: 'center' }}>
                  <PrizeIcon id={id} size={u(32)} color={SLICE[id].ink} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.bodyMedium, fontSize: u(22), lineHeight: u(22) * 1.2, color: C.foam }}>{p.table}</Text>
                  <Text style={{ fontFamily: F.body, fontSize: u(16), color: C.mist }}>{p.tableNote}</Text>
                </View>
                <Text style={{ fontFamily: F.displayMedium, fontSize: u(19), color: C.foam, fontVariant: ['tabular-nums'] }}>
                  {hi == null ? `${amount(lo)} zł ${t.rules.andMore}` : `${amount(lo)} – ${amount(hi)} zł`}
                </Text>
              </View>
            );
          })}
        </Animated.View>

        <Animated.View entering={rise(2)} style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: u(32), rowGap: u(16) }}>
          {t.rules.clauses.map(([head, body], i) => (
            <View key={i} style={{ width: half }}>
              <Text style={{ fontFamily: F.bodySemi, fontSize: u(17), color: C.foam, marginBottom: u(2) }}>
                <Text style={{ color: C.pumpkin }}>{i + 1}. </Text>
                {head}
              </Text>
              <Text style={{ fontFamily: F.body, fontSize: u(16), lineHeight: u(16) * 1.42, color: C.mist }}>
                <Clause text={body} size={u(16)} />
              </Text>
            </View>
          ))}
        </Animated.View>

        <Animated.View entering={rise(3)} style={{ flexDirection: 'row', gap: u(16) }}>
          <GhostButton label={t.rules.back} onPress={back} icon={<UiIcon name="back" size={u(28)} color={C.foam} strokeWidth={2.4} />} />
          <PrimaryButton label={t.rules.scan} onPress={() => go('scan')} />
        </Animated.View>
      </View>
    </ScreenFrame>
  );
}
