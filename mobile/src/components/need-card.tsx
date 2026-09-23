import { StyleSheet, View } from 'react-native';

import type { NearbyNeed } from '@/api/needs';
import { CategoryIcon } from '@/components/category-icon';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Spacing } from '@/constants/theme';
import { formatDistance, formatQuantity, formatWindow, lower } from '@/lib/format';
import { formatClosesIn, isClosingSoon } from '@/lib/urgency';

export function NeedCard({ need, onPress }: { need: NearbyNeed; onPress: () => void }) {
  const pledged = need.quantity_needed - need.quantity_remaining;
  return (
    <Card onPress={onPress} style={styles.card}>
      <CategoryIcon category={need.category} />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <ThemedText type="bold" style={styles.title} numberOfLines={2}>
            {lower(need.title)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatDistance(need.distance_m)}
          </ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {lower(need.organization_name)}
        </ThemedText>
        <View style={styles.progress}>
          <ProgressBar
            value={pledged / need.quantity_needed}
            accessibilityLabel={`${pledged} of ${need.quantity_needed} pledged`}
          />
        </View>
        <View style={styles.footer}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
            <ThemedText type="smallBold">{formatQuantity(need.quantity_remaining, need.unit)}</ThemedText> still needed
          </ThemedText>
          {isClosingSoon(need.dropoff_ends_at) ? (
            <ThemedText type="smallBold" themeColor="accent">
              {formatClosesIn(need.dropoff_ends_at)}
            </ThemedText>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              {formatWindow(need.dropoff_starts_at, need.dropoff_ends_at)}
            </ThemedText>
          )}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: Spacing.three - 2, alignItems: 'flex-start' },
  body: { flex: 1, gap: Spacing.half },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: Spacing.two },
  title: { flex: 1 },
  progress: { marginTop: Spacing.two, marginBottom: Spacing.one },
  footer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', columnGap: Spacing.two },
  flex: { flexShrink: 1 },
});
