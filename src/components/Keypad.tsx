import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { CONFIG } from '../config';
import { useI18n } from '../i18n';
import { money } from '../prizes';
import { Sound } from '../sound';
import { C, F, useLayout } from '../theme';
import { GhostButton, PrimaryButton } from './Buttons';
import { UiIcon } from './Icons';

const ROWS = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['00', '0', 'del']];

/** Staff-only entry: the PIN first, then the total typed like a till (digits shift in from the right). */
export function Keypad({ onCancel, onTotal }: { onCancel: () => void; onTotal: (total: number) => void }) {
  const { t } = useI18n();
  const { u } = useLayout();
  const [step, setStep] = useState<'pin' | 'total'>('pin');
  const [pin, setPin] = useState('');
  const [wrong, setWrong] = useState(false);
  const [cents, setCents] = useState(0);

  const press = (k: string) => {
    Sound.tick(0.4);
    setWrong(false);
    if (step === 'pin') {
      if (k === 'del') setPin(p => p.slice(0, -1));
      else setPin(p => (p + k).slice(0, 8));
      return;
    }
    if (k === 'del') setCents(c => Math.floor(c / 10));
    else setCents(c => { const n = c * (k === '00' ? 100 : 10) + (k === '00' ? 0 : +k); return n <= 999999 ? n : c; });
  };

  const confirm = () => {
    if (step === 'pin') {
      if (pin === CONFIG.staffPin) { setStep('total'); setPin(''); }
      else { Sound.error(); setWrong(true); setPin(''); }
      return;
    }
    onTotal(cents / 100);
  };

  const display = step === 'pin' ? (wrong ? t.keypad.wrongPin : '•'.repeat(pin.length) || ' ') : money(cents / 100);
  const canConfirm = step === 'pin' ? pin.length > 0 : cents > 0;

  return (
    <Animated.View entering={FadeIn.duration(250)} style={[StyleSheet.absoluteFill, { zIndex: 45, backgroundColor: 'rgba(6,13,20,0.78)', alignItems: 'center', justifyContent: 'center', padding: 16 }]}>
      <Animated.View
        entering={FadeInDown.duration(300)}
        accessibilityViewIsModal
        style={{ width: Math.min(u(560), 600), gap: u(16), padding: u(28), borderRadius: u(28), backgroundColor: C.deep, borderWidth: 1, borderColor: C.line }}
      >
        <Text accessibilityRole="header" style={{ fontFamily: F.displaySemi, fontSize: u(30), color: C.foam }}>{step === 'pin' ? t.keypad.pinTitle : t.keypad.title}</Text>
        <View style={{ borderRadius: u(16), backgroundColor: C.ink, paddingVertical: u(10), paddingHorizontal: u(22) }} accessibilityLiveRegion="polite">
          <Text style={{ fontFamily: F.displaySemi, fontSize: u(56), lineHeight: u(56) * 1.15, textAlign: 'right', color: wrong ? C.fail : C.foam, fontVariant: ['tabular-nums'] }}>{display}</Text>
        </View>
        <View style={{ gap: u(10) }}>
          {ROWS.map(row => (
            <View key={row.join()} style={{ flexDirection: 'row', gap: u(10) }}>
              {row.map(k => (
                <Pressable
                  key={k}
                  onPress={() => press(k)}
                  accessibilityRole="button"
                  accessibilityLabel={k === 'del' ? t.keypad.del : k}
                  style={({ pressed }) => ({
                    flex: 1, minHeight: u(84), borderRadius: u(16), borderWidth: 1, borderColor: C.line,
                    alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? 'rgba(255,122,26,0.22)' : 'transparent',
                  })}
                >
                  {k === 'del' ? <UiIcon name="delete" size={u(30)} color={C.foam} strokeWidth={2} /> : <Text style={{ fontFamily: F.bodyMedium, fontSize: u(30), color: C.foam }}>{k}</Text>}
                </Pressable>
              ))}
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: u(12) }}>
          <GhostButton label={t.keypad.cancel} onPress={onCancel} style={{ flex: 1, paddingHorizontal: u(20) }} />
          <PrimaryButton label={step === 'pin' ? t.keypad.next : t.keypad.use} onPress={confirm} disabled={!canConfirm} padX={20} style={{ flex: 1 }} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}
