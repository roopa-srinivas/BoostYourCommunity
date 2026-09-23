import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Badge } from '@/lib/badges';
import { formatDay } from '@/lib/format';

/** An earned badge in full color, or a locked one faded with its goal. */
export function BadgeTile({ badge }: { badge: Badge }) {
  const theme = useTheme();
  const earned = !!badge.earnedAt;
  return (
    <View
      style={[styles.tile, { backgroundColor: theme.backgroundElement, boxShadow: `0 1px 3px ${theme.shadow}` }]}
      accessibilityLabel={
        earned
          ? `${badge.title}, earned ${formatDay(badge.earnedAt!)}`
          : `${badge.title}, locked until ${badge.milestone} items`
      }>
      <View style={[styles.icon, { backgroundColor: earned ? theme.accentSoft : theme.backgroundSelected }]}>
        <SymbolView
          name={earned ? badge.icon : { ios: 'lock.fill', android: 'lock', web: 'lock' }}
          size={22}
          tintColor={earned ? theme.accent : theme.textSecondary}
        />
      </View>
      <ThemedText type="smallBold" style={[styles.center, styles.title]} numberOfLines={2}>
        {badge.title}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={[styles.center, styles.caption]}>
        {earned ? formatDay(badge.earnedAt!) : `${badge.milestone} items`}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, alignItems: 'center', gap: Spacing.one, paddingVertical: Spacing.three, paddingHorizontal: Spacing.one, borderRadius: Radius.card },
  // Small enough that the longest word ("neighborhood") fits a third of a phone screen.
  title: { fontSize: 13, lineHeight: 17 },
  icon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.one },
  center: { textAlign: 'center' },
  caption: { fontSize: 12, lineHeight: 16 },
});
