import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useOrganizationNeeds } from '@/api/needs';
import { CategoryIcon } from '@/components/category-icon';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { formatDay, formatQuantity, lower } from '@/lib/format';

const MAX_SHOWN = 6;

/**
 * "Start from a past need" at the top of the post-a-need form: staff reach
 * for "post a need" to repeat something, so offer their past needs right
 * there. Each distinct need appears once (its latest version), newest first.
 */
export function PastNeedPicker({ organizationId }: { organizationId: string }) {
  const needs = useOrganizationNeeds(organizationId);

  const latestByTitle = new Map<string, NonNullable<typeof needs.data>[number]>();
  for (const need of needs.data ?? []) {
    const key = need.title.trim().toLowerCase();
    const seen = latestByTitle.get(key);
    if (!seen || new Date(need.dropoff_starts_at) > new Date(seen.dropoff_starts_at)) latestByTitle.set(key, need);
  }
  const recent = [...latestByTitle.values()]
    .sort((a, b) => new Date(b.dropoff_starts_at).getTime() - new Date(a.dropoff_starts_at).getTime())
    .slice(0, MAX_SHOWN);

  if (recent.length === 0) return null;

  return (
    <View style={styles.section}>
      <ThemedText type="sectionTitle">start from a past need</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        tap one to fill in the form with it and a new drop-off time.
      </ThemedText>
      {recent.map((need) => (
        <Card
          key={need.id}
          style={styles.card}
          accessibilityLabel={`start from ${lower(need.title)}`}
          onPress={() => router.replace({ pathname: '/organization/need-form', params: { copyFrom: need.id } })}>
          <CategoryIcon category={need.category} size={36} />
          <View style={styles.flex}>
            <ThemedText type="bold" numberOfLines={1}>
              {lower(need.title)}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {formatQuantity(need.quantity_needed, need.unit)} · last posted for {formatDay(new Date(need.dropoff_starts_at))}
              {need.repeats_weekly ? ' · weekly' : ''}
            </ThemedText>
          </View>
          <ThemedText type="bold" themeColor="tint">
            ›
          </ThemedText>
        </Card>
      ))}
      <ThemedText type="sectionTitle" style={styles.or}>
        or post something new
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two },
  card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two + 4 },
  flex: { flex: 1 },
  or: { marginTop: Spacing.three },
});
