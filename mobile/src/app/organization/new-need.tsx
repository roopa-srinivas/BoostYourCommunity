import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { useOrganizationNeeds } from '@/api/needs';
import { CategoryIcon } from '@/components/category-icon';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorText, Loading } from '@/components/ui/message';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import type { Tables } from '@/lib/database.types';
import { errorMessage, formatDay, formatQuantity, lower } from '@/lib/format';

const MAX_SHOWN = 8;

/** Each distinct need once (its latest version), newest first. */
function distinctRecent(needs: Tables<'needs'>[]) {
  const latestByTitle = new Map<string, Tables<'needs'>>();
  for (const need of needs) {
    const key = need.title.trim().toLowerCase();
    const seen = latestByTitle.get(key);
    if (!seen || new Date(need.dropoff_starts_at) > new Date(seen.dropoff_starts_at)) latestByTitle.set(key, need);
  }
  return [...latestByTitle.values()]
    .sort((a, b) => new Date(b.dropoff_starts_at).getTime() - new Date(a.dropoff_starts_at).getTime())
    .slice(0, MAX_SHOWN);
}

/**
 * "What are you posting?": choose something new or a past need before the
 * form, so nobody types into a form and then loses it by picking a past need.
 * Organizations without past needs go straight to the empty form.
 */
export default function NewNeedScreen() {
  const { organizationId } = useLocalSearchParams<{ organizationId: string }>();
  const needs = useOrganizationNeeds(organizationId);
  const recent = distinctRecent(needs.data ?? []);
  const nothingToReuse = needs.isSuccess && recent.length === 0;

  const startNew = () => router.replace({ pathname: '/organization/need-form', params: { organizationId } });

  useEffect(() => {
    if (nothingToReuse) router.replace({ pathname: '/organization/need-form', params: { organizationId } });
  }, [nothingToReuse, organizationId]);

  if (needs.isPending || nothingToReuse) return <Loading />;

  return (
    <Screen>
      {needs.error ? <ErrorText>{errorMessage(needs.error)}</ErrorText> : null}
      <Button label="something new" onPress={startNew} />

      <View style={styles.section}>
        <ThemedText type="sectionTitle">or like one you’ve posted before</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          we’ll fill in the form with it and a new drop-off time. you can change anything before posting.
        </ThemedText>
        {recent.map((need) => (
          <Card
            key={need.id}
            style={styles.card}
            accessibilityLabel={`post ${lower(need.title)} again`}
            onPress={() => router.replace({ pathname: '/organization/need-form', params: { copyFrom: need.id } })}>
            <CategoryIcon category={need.category} size={36} />
            <View style={styles.flex}>
              <ThemedText type="bold" numberOfLines={1}>
                {lower(need.title)}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {formatQuantity(need.quantity_needed, need.unit)} · last posted for{' '}
                {formatDay(new Date(need.dropoff_starts_at))}
                {need.repeats_weekly ? ' · weekly' : ''}
              </ThemedText>
            </View>
            <ThemedText type="bold" themeColor="tint">
              ›
            </ThemedText>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two, marginTop: Spacing.three },
  card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two + 4 },
  flex: { flex: 1 },
});
