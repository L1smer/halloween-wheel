import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { getLocales } from 'expo-localization';

import { CONFIG, type Lang } from '../config';
import en, { type Strings } from './en';
import pl from './pl';

const STRINGS: Record<Lang, Strings> = { en, pl };
export const LANGS: Lang[] = ['en', 'pl'];

function defaultLang(): Lang {
  if (CONFIG.defaultLanguage !== 'device') return CONFIG.defaultLanguage;
  const code = getLocales()[0]?.languageCode;
  return code === 'pl' ? 'pl' : 'en';
}

type I18n = { lang: Lang; t: Strings; setLang: (l: Lang) => void; resetLang: () => void };
const Ctx = createContext<I18n | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(defaultLang);
  // The next customer starts in the café's default language
  const resetLang = useCallback(() => setLang(defaultLang()), []);
  const value = useMemo(() => ({ lang, t: STRINGS[lang], setLang, resetLang }), [lang, resetLang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useI18n must be used inside LanguageProvider');
  return v;
}
