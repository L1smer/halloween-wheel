import { useState, type ReactNode } from 'react';
import { Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { C, F, useLayout } from '../theme';

// Every screen is one centred column. The stage (wheel, camera, prize) takes the
// height that is left, so nothing ever needs to scroll.

export function ScreenFrame({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { u, insets } = useLayout();
  const pad = Math.max(16, u(48));
  return (
    <View
      style={[
        {
          flex: 1,
          alignItems: 'center',
          gap: u(26),
          paddingTop: insets.top + u(116),
          paddingBottom: insets.bottom + u(52),
          paddingLeft: insets.left + pad,
          paddingRight: insets.right + pad,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Col({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { u, colWidth } = useLayout();
  return <View style={[{ width: colWidth, alignItems: 'center', gap: u(20) }, style]}>{children}</View>;
}

/** Flexible area that hands its measured size to its children. */
export function Stage({ children }: { children: (size: { width: number; height: number }) => ReactNode }) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  return (
    <View
      style={{ flex: 1, alignSelf: 'stretch', minHeight: 0, alignItems: 'center', justifyContent: 'center' }}
      onLayout={e => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
    >
      {size.width > 0 && size.height > 0 ? children(size) : null}
    </View>
  );
}

export function Eyebrow({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const { u } = useLayout();
  return <Text style={[{ fontFamily: F.bodySemi, fontSize: u(16), letterSpacing: u(16) * 0.14, textTransform: 'uppercase', color: C.pumpkin, textAlign: 'center' }, style]}>{children}</Text>;
}

export function Title({ children, size = 54, style }: { children: ReactNode; size?: number; style?: StyleProp<TextStyle> }) {
  const { u } = useLayout();
  return <Text style={[{ fontFamily: F.displaySemi, fontSize: u(size), lineHeight: u(size) * 1.12, letterSpacing: -u(size) * 0.02, color: C.foam, textAlign: 'center' }, style]}>{children}</Text>;
}

export function Lede({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const { u } = useLayout();
  return <Text style={[{ fontFamily: F.body, fontSize: u(25), lineHeight: u(25) * 1.4, color: C.mist, textAlign: 'center', maxWidth: u(640) }, style]}>{children}</Text>;
}
