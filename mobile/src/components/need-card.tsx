import { StyleSheet, View } from 'react-native';

import type { NearbyNeed } from '@/api/needs';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { formatDistance, formatWindow } from '@/lib/format';
import { categoryLabel } from '@/lib/labels';

export function NeedCard({ need, onPress }: { need: NearbyNeed; onPress: () => void }) {
  return (
    <Card onPress={onPress}>
      <View style={styles.header}>
        <Badge label={categoryLabel(need.category)} tone="info" />
        <ThemedText type="small" themeColor="textSecondary">
          {formatDistance(need.distance_m)}
        </ThemedText>
      </View>
      <ThemedText type="smallBold" style={styles.title}>
        {need.title}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {need.organization_name}
      </ThemedText>
      <ThemedText type="small">
        {need.quantity_remaining} of {need.quantity_needed} {need.unit} still needed
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Drop off {formatWindow(need.dropoff_starts_at, need.dropoff_ends_at)}
      </ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.one },
  title: { fontSize: 17 },
});
