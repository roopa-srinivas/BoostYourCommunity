/**
 * The app's look: warm cream and forest green with terracotta accents, a
 * serif (Fraunces) for headings and a rounded sans (DM Sans) for everything
 * else. Dark mode keeps the same warmth instead of plain black.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#2A2118',
    textSecondary: '#6B5D4F',
    background: '#F6F1E7',
    /** Cards, chips and other raised surfaces. */
    backgroundElement: '#FFFBF4',
    /** Secondary buttons and pressed/selected surfaces; visible on both of the above. */
    backgroundSelected: '#EDE3D3',
    border: '#E9DFCF',
    /** Forest green: primary actions, progress, the selected tab. */
    tint: '#2F5D46',
    onTint: '#FFFBF4',
    tintSoft: '#DCE8E1',
    /** Terracotta: map pins and warm highlights. */
    accent: '#B4502B',
    onAccent: '#FFFBF4',
    accentSoft: '#F3E1D6',
    success: '#2F6B3F',
    successSoft: '#DCEBD9',
    warning: '#8A5A00',
    warningSoft: '#F6E6C2',
    danger: '#B42318',
    dangerSoft: '#F8DEDA',
    shadow: 'rgba(42, 33, 24, 0.10)',
  },
  dark: {
    text: '#F3EBDD',
    textSecondary: '#BBAE9C',
    background: '#17140F',
    backgroundElement: '#221E17',
    backgroundSelected: '#312A21',
    border: '#332C23',
    tint: '#8CC4A5',
    onTint: '#10251A',
    tintSoft: '#1E3528',
    accent: '#E28E69',
    onAccent: '#2A1308',
    accentSoft: '#3D2419',
    success: '#8CC98F',
    successSoft: '#1D3320',
    warning: '#E8C06A',
    warningSoft: '#3A2C0E',
    danger: '#F19A8F',
    dangerSoft: '#3F1B17',
    shadow: 'rgba(0, 0, 0, 0)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Font family names as registered by `useFonts` in the root layout. Custom
 * fonts need one family per weight: set `fontFamily`, not `fontWeight`.
 */
export const FontFamily = {
  display: 'Fraunces_600SemiBold',
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  bold: 'DMSans_700Bold',
} as const;

export const Fonts = Platform.select({
  ios: { mono: 'ui-monospace' },
  web: { mono: 'var(--font-mono)' },
  default: { mono: 'monospace' },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  card: 22,
  field: 14,
  tile: 16,
  pill: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
