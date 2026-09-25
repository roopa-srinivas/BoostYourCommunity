import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useOrganizationStats, type OrganizationStats } from '@/api/organizations';
import { CategoryIcon } from '@/components/category-icon';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { ChipGroup } from '@/components/ui/chip';
import { EmptyState, ErrorText, Loading } from '@/components/ui/message';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { StatTile } from '@/components/ui/stat-tile';
import { Spacing } from '@/constants/theme';
import { errorMessage } from '@/lib/format';
import { categoryLabel } from '@/lib/labels';
import { arrivalRate } from '@/lib/stats';

const PERIODS = [
  { value: 30, label: 'last 30 days' },
  { value: 90, label: 'last 90 days' },
  { value: 365, label: 'last year' },
] as const;

/** An organization's numbers: what came in, how reliably pledges arrive, and what's most needed. */
export default function DashboardScreen() {
  const { organizationId } = useLocalSearchParams<{ organizationId: string }>();
  const [days, setDays] = useState<number>(30);
  const stats = useOrganizationStats(organizationId, days);

  return (
    <Screen onRefresh={stats.refetch}>
      <ChipGroup scroll options={PERIODS} value={days} onChange={setDays} />
      {stats.error ? <ErrorText>{errorMessage(stats.error)}</ErrorText> : null}
      {stats.isPending ? <Loading /> : stats.data ? <Dashboard stats={stats.data} /> : null}
    </Screen>
  );
}

function Dashboard({ stats }: { stats: OrganizationStats }) {
  const rate = arrivalRate(stats);
  const gaps = stats.categories
    .map((c) => ({ ...c, short: c.needed - c.received }))
    .filter((c) => c.short > 0)
    .sort((a, b) => b.short - a.short);

  return (
    <>
      <View style={styles.row}>
        <StatTile value={stats.items_received} label={'items\nreceived'} />
        <StatTile value={stats.dropoffs} label={'drop-offs\nconfirmed'} />
        <StatTile value={stats.donors} label={stats.donors === 1 ? 'donor\n' : 'different\ndonors'} />
      </View>

      <Card style={styles.card}>
        <ThemedText type="sectionTitle">pledges that arrived</ThemedText>
        {rate === null ? (
          <ThemedText type="small" themeColor="textSecondary">
            no pledges were checked in or marked “not dropped off” in this period yet.
          </ThemedText>
        ) : (
          <>
            <ThemedText>
              <ThemedText type="bold">{Math.round(rate * 100)}%</ThemedText> of pledges were dropped off
            </ThemedText>
            <ProgressBar value={rate} accessibilityLabel={`${Math.round(rate * 100)} percent arrived`} />
            <ThemedText type="small" themeColor="textSecondary">
              {stats.arrived} arrived · {stats.no_shows} didn’t. pledges not checked in within a day of the drop-off
              window count as not dropped off.
            </ThemedText>
          </>
        )}
      </Card>

      <View style={styles.row}>
        <StatTile value={stats.expected_items} label={stats.expected_items === 1 ? 'item still\nexpected' : 'items still\nexpected'} />
        <StatTile value={`${stats.needs_filled}/${stats.needs_posted}`} label={'needs fully\nmet'} />
        <StatTile value={stats.followers} label={stats.followers === 1 ? 'follower\n' : 'followers\n'} />
      </View>

      <View style={styles.section}>
        <ThemedText type="sectionTitle">what you asked for</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          needs whose drop-off started in this period, most asked-for first, and how much came in.
        </ThemedText>
        {stats.categories.length === 0 ? (
          <EmptyState title="no needs in this period" body="post a need and it’ll show up here." />
        ) : (
          <Card style={styles.card}>
            {stats.categories.map((c) => (
              <View key={c.category} style={styles.category}>
                <CategoryIcon category={c.category} size={36} />
                <View style={styles.flex}>
                  <View style={styles.categoryHeader}>
                    <ThemedText type="bold">{categoryLabel(c.category)}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {c.received} of {c.needed}
                    </ThemedText>
                  </View>
                  <ProgressBar
                    value={c.needed === 0 ? 0 : c.received / c.needed}
                    accessibilityLabel={`${categoryLabel(c.category)}: ${c.received} of ${c.needed} came in`}
                  />
                </View>
              </View>
            ))}
            {gaps.length > 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                biggest gap: <ThemedText type="smallBold">{categoryLabel(gaps[0].category)}</ThemedText>, {gaps[0].short}{' '}
                short of what you asked for.
              </ThemedText>
            ) : null}
          </Card>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two },
  card: { gap: Spacing.two },
  section: { gap: Spacing.two, marginTop: Spacing.two },
  category: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: Spacing.one },
  flex: { flex: 1 },
});
