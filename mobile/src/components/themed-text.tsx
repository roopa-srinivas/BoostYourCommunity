import { StyleSheet, Text, type TextProps } from 'react-native';

import { FontFamily, Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'bold' | 'title' | 'subtitle' | 'sectionTitle' | 'small' | 'smallBold' | 'link' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? (type === 'link' ? 'tint' : 'text')] },
        styles[type],
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: { fontFamily: FontFamily.regular, fontSize: 16, lineHeight: 23 },
  bold: { fontFamily: FontFamily.bold, fontSize: 17, lineHeight: 23 },
  small: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 20 },
  smallBold: { fontFamily: FontFamily.bold, fontSize: 14, lineHeight: 20 },
  /** Big serif headline, e.g. the Give screen's opening line. */
  title: { fontFamily: FontFamily.display, fontSize: 28, lineHeight: 34, letterSpacing: -0.3 },
  /** Serif heading for a screen's main subject, e.g. a need's title. */
  subtitle: { fontFamily: FontFamily.display, fontSize: 24, lineHeight: 30, letterSpacing: -0.2 },
  /** Serif label above a group of items, e.g. "needs near you". */
  sectionTitle: { fontFamily: FontFamily.display, fontSize: 19, lineHeight: 25 },
  link: { fontFamily: FontFamily.medium, fontSize: 14, lineHeight: 20 },
  code: { fontFamily: Fonts.mono, fontSize: 12 },
});
