import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type BadgeTone = 'neutral' | 'info' | 'accent' | 'success' | 'warning' | 'danger';

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const theme = useTheme();
  const colors = {
    neutral: [theme.backgroundSelected, theme.textSecondary],
    info: [theme.tintSoft, theme.tint],
    accent: [theme.accentSoft, theme.accent],
    success: [theme.successSoft, theme.success],
    warning: [theme.warningSoft, theme.warning],
    danger: [theme.dangerSoft, theme.danger],
  }[tone];

  return (
    <View style={[styles.badge, { backgroundColor: colors[0] }]}>
      <ThemedText type="smallBold" style={{ color: colors[1], fontSize: 12, lineHeight: 16 }}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: 999,
  },
});
