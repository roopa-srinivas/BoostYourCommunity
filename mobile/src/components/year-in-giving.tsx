import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { MyPledge } from '@/api/pledges';
import { CategoryIcon } from '@/components/category-icon';
import { ThemedText } from '@/components/themed-text';
import { ChipGroup } from '@/components/ui/chip';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { categoryLabel } from '@/lib/labels';
import { givingYears, yearInGiving, type ConfirmedGift } from '@/lib/stats';

/** "your 2026 in giving": the year's confirmed drop-offs, summed up. */
export function YearInGivingCard({ pledges }: { pledges: MyPledge[] }) {
  const theme = useTheme();
  // Read the year once, not on every render.
  const [thisYear] = useState(() => new Date().getFullYear());
  const [chosenYear, setChosenYear] = useState<number | null>(null);

  const gifts = useMemo<ConfirmedGift[]>(
    () =>
      pledges
        .filter((p) => p.status === 'received' && p.resolved_at)
        .map((p) => ({
          quantity: p.quantity,
          resolvedAt: new Date(p.resolved_at!),
          category: p.need?.category ?? null,
          organizationId: p.need?.organization?.id ?? null,
        })),
    [pledges],
  );

  const years = givingYears(gifts);
  if (!years.includes(thisYear)) years.unshift(thisYear);
  const year = chosenYear ?? thisYear;
  const summary = yearInGiving(gifts, year);

  return (
    <View style={[styles.card, { backgroundColor: theme.tintSoft }]}>
      <View style={styles.header}>
        <ThemedText type="sectionTitle" themeColor="tint">
          your {year} in giving
        </ThemedText>
        {summary.topCategory ? <CategoryIcon category={summary.topCategory} size={40} /> : null}
      </View>

      {summary.items === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          {year === thisYear
            ? 'your year starts with your first confirmed drop-off.'
            : 'no confirmed drop-offs that year.'}
        </ThemedText>
      ) : (
        <>
          <ThemedText>
            <ThemedText type="title" themeColor="tint">
              {summary.items}
            </ThemedText>{' '}
            {summary.items === 1 ? 'item' : 'items'} given
          </ThemedText>
          <ThemedText>
            across {summary.dropoffs} {summary.dropoffs === 1 ? 'drop-off' : 'drop-offs'} at {summary.places}{' '}
            {summary.places === 1 ? 'place' : 'places'}.
          </ThemedText>
          {summary.topCategory || summary.busiestMonth ? (
            <ThemedText type="small" themeColor="textSecondary">
              {[
                summary.topCategory ? `mostly ${categoryLabel(summary.topCategory)}` : null,
                summary.busiestMonth ? `busiest in ${summary.busiestMonth}` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </ThemedText>
          ) : null}
        </>
      )}

      {years.length > 1 ? (
        <ChipGroup
          scroll
          options={years.map((y) => ({ value: y, label: String(y) }))}
          value={year}
          onChange={setChosenYear}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.card },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
});
