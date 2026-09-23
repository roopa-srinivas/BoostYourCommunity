import { DarkTheme, DefaultTheme, type Theme } from 'expo-router';

import { Colors, FontFamily } from '@/constants/theme';

const fonts: Theme['fonts'] = {
  regular: { fontFamily: FontFamily.regular, fontWeight: '400' },
  medium: { fontFamily: FontFamily.medium, fontWeight: '500' },
  bold: { fontFamily: FontFamily.bold, fontWeight: '700' },
  heavy: { fontFamily: FontFamily.bold, fontWeight: '700' },
};

/** Navigation colors (headers, backgrounds, back buttons) matching the app theme. */
export function navigationTheme(scheme: 'light' | 'dark'): Theme {
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const colors = Colors[scheme];
  return {
    ...base,
    fonts,
    colors: {
      ...base.colors,
      primary: colors.tint,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.border,
      notification: colors.accent,
    },
  };
}
