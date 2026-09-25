import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';

/** A big number over a two-line label. Put several in a row. */
export function StatTile({ value, label }: { value: number | string; label: string }) {
  return (
    <Card style={styles.stat}>
      <ThemedText type="title">{value}</ThemedText>
      {/* Every label is two lines, centred, so tiles in a row line up. */}
      <ThemedText type="small" themeColor="textSecondary" style={styles.label} numberOfLines={2}>
        {label}
      </ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  stat: { flex: 1, alignItems: 'center', paddingHorizontal: Spacing.two, paddingVertical: Spacing.three },
  label: { textAlign: 'center', fontSize: 13, lineHeight: 17 },
});
