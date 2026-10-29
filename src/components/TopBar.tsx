import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { LANGS, useI18n } from '../i18n';
import { useKiosk } from '../kiosk';
import { Sound } from '../sound';
import { C, F, useLayout } from '../theme';
import { IconButton } from './Buttons';
import { UiIcon, WaveMark } from './Icons';

function LanguageSwitch() {
  const { lang, setLang, t } = useI18n();
  const { u } = useLayout();
  const h = Math.max(40, u(54));
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={t.brand.language} style={{ flexDirection: 'row', height: h, borderRadius: h / 2, borderWidth: 1, borderColor: C.line, padding: 4, gap: 2 }}>
      {LANGS.map(l => {
        const on = l === lang;
        return (
          <Pressable
            key={l}
            onPress={() => setLang(l)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={l === 'en' ? 'English' : 'Polski'}
            style={{ minWidth: h - 4, paddingHorizontal: 10, borderRadius: h / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.foam : 'transparent' }}
          >
            <Text style={{ fontFamily: F.bodySemi, fontSize: Math.max(13, u(17)), letterSpacing: 0.6, color: on ? C.ink : C.mist }}>{l.toUpperCase()}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function TopBar() {
  const { t } = useI18n();
  const { screen, go } = useKiosk();
  const { u, insets } = useLayout();
  const [soundOn, setSoundOn] = useState(Sound.isOn());
  useEffect(() => Sound.subscribe(setSoundOn), []);
  const pad = Math.max(16, u(48));
  const icon = Math.max(18, u(24));

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', top: insets.top + u(28), left: insets.left + pad, right: insets.right + pad, zIndex: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: u(10) }} accessibilityRole="header">
        <WaveMark size={Math.max(20, u(30))} color={C.wave} />
        <Text style={{ fontFamily: F.displaySemi, fontSize: Math.max(13, u(22)), letterSpacing: -0.2, color: C.foam }}>CoffeeOcean</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: u(10) }}>
        {screen !== 'welcome' && (
          <IconButton onPress={() => go('welcome')} accessibilityLabel={t.brand.home}>
            <UiIcon name="home" size={icon} color={C.mist} strokeWidth={2} />
          </IconButton>
        )}
        <LanguageSwitch />
        <IconButton onPress={() => Sound.toggle()} accessibilityLabel={soundOn ? t.brand.soundOn : t.brand.soundOff}>
          <UiIcon name={soundOn ? 'soundOn' : 'soundOff'} size={icon} color={C.mist} strokeWidth={2} />
        </IconButton>
      </View>
    </View>
  );
}
