import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useNeed, useSaveNeed } from '@/api/needs';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ChipGroup } from '@/components/ui/chip';
import { DateTimeField } from '@/components/ui/date-time-field';
import { ErrorText, Loading } from '@/components/ui/message';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { ToggleRow } from '@/components/ui/toggle-row';
import { Spacing } from '@/constants/theme';
import type { Tables } from '@/lib/database.types';
import { errorMessage } from '@/lib/format';
import { goBackOr } from '@/lib/navigation';
import { CATEGORIES, type NeedCategory } from '@/lib/labels';

/**
 * Post a new need (`organizationId` param), edit one (`needId`), or post a
 * past need again with new dates (`copyFrom`).
 */
export default function NeedFormScreen() {
  const { organizationId, needId, copyFrom } = useLocalSearchParams<{
    organizationId?: string;
    needId?: string;
    copyFrom?: string;
  }>();
  const existing = useNeed(needId ?? copyFrom);

  if ((needId || copyFrom) && existing.isPending) return <Loading />;
  if ((needId || copyFrom) && !existing.data) {
    return (
      <Screen>
        <ErrorText>{existing.error ? errorMessage(existing.error) : 'this need could not be found.'}</ErrorText>
      </Screen>
    );
  }

  const orgId = existing.data?.organization_id ?? organizationId;
  if (!orgId) {
    return (
      <Screen>
        <ErrorText>missing organization.</ErrorText>
      </Screen>
    );
  }
  return needId ? (
    <NeedForm organizationId={orgId} need={existing.data} />
  ) : (
    <NeedForm organizationId={orgId} template={existing.data} />
  );
}

/**
 * The same window moved forward by whole calendar days (at least one) until
 * it starts in the future: same local time of day (even across a daylight
 * saving change) and the same length.
 */
function nextWindow(startsAt: string, endsAt: string, now = Date.now()) {
  const originalStart = new Date(startsAt);
  const length = new Date(endsAt).getTime() - originalStart.getTime();
  const start = new Date(originalStart);
  do {
    start.setDate(start.getDate() + 1);
  } while (start.getTime() <= now);
  return { start, end: new Date(start.getTime() + length) };
}

function nextHour() {
  const date = new Date();
  date.setHours(date.getHours() + 1, 0, 0, 0);
  return date;
}

function NeedForm({
  organizationId,
  need,
  template,
}: {
  organizationId: string;
  /** The need being edited. */
  need?: Tables<'needs'>;
  /** A past need to post again as a new one. */
  template?: Tables<'needs'>;
}) {
  const source = need ?? template;
  const [copiedWindow] = useState(() =>
    template ? nextWindow(template.dropoff_starts_at, template.dropoff_ends_at) : null,
  );
  const save = useSaveNeed();
  const [category, setCategory] = useState<NeedCategory>(source?.category ?? 'food');
  const [title, setTitle] = useState(source?.title ?? '');
  const [details, setDetails] = useState(source?.details ?? '');
  const [quantity, setQuantity] = useState(source ? String(source.quantity_needed) : '');
  const [unit, setUnit] = useState(source?.unit ?? 'items');
  // Editing keeps the current setting; a new need or a copy starts off one-off.
  const [repeatsWeekly, setRepeatsWeekly] = useState(need?.repeats_weekly ?? false);
  const [startsAt, setStartsAt] = useState(() =>
    need ? new Date(need.dropoff_starts_at) : (copiedWindow?.start ?? nextHour()),
  );
  const [endsAt, setEndsAt] = useState(() =>
    need
      ? new Date(need.dropoff_ends_at)
      : (copiedWindow?.end ?? new Date(nextHour().getTime() + 3 * 3_600_000)),
  );
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    const quantityNeeded = Number(quantity);
    if (title.trim().length < 3) return setError('give the need a short title, like “new socks, adult sizes”.');
    if (!Number.isInteger(quantityNeeded) || quantityNeeded < 1) return setError('enter how many you need.');
    if (!unit.trim()) return setError('enter a unit, like “pairs” or “cans”.');
    if (endsAt <= startsAt) return setError('the drop-off window has to end after it starts.');
    if (endsAt <= new Date()) return setError('the drop-off window has to end in the future.');

    try {
      const id = await save.mutateAsync({
        needId: need?.id,
        organizationId,
        fields: {
          category,
          title: title.trim(),
          details: details.trim() || null,
          quantity_needed: quantityNeeded,
          unit: unit.trim(),
          dropoff_starts_at: startsAt.toISOString(),
          dropoff_ends_at: endsAt.toISOString(),
          repeats_weekly: repeatsWeekly,
        },
      });
      if (need) {
        goBackOr({ pathname: '/organization/need/[id]', params: { id } });
      } else {
        // Posted: close the form (and the "what are you posting?" step) so
        // back from the new need goes to the organization tab, not the form.
        router.dismissTo('/organization');
        router.push({ pathname: '/organization/need/[id]', params: { id } });
      }
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: need ? 'edit need' : template ? 'post again' : 'post a need' }} />
      {template ? (
        <ThemedText type="small" themeColor="textSecondary">
          copied from a past need, with a new drop-off window at the same time of day. check the dates and how many
          you need.
        </ThemedText>
      ) : null}

      <View style={styles.field}>
        <ThemedText type="smallBold">category</ThemedText>
        <ChipGroup options={CATEGORIES} value={category} onChange={setCategory} />
      </View>
      <TextField
        label="what do you need?"
        value={title}
        onChangeText={setTitle}
        placeholder="new socks, adult sizes"
        hint="be specific so donors bring the right thing."
      />
      <TextField
        label="details (optional)"
        value={details}
        onChangeText={setDetails}
        multiline
        placeholder="sizes, brands, what you can't accept…"
      />
      <View style={styles.row}>
        <View style={styles.rowItem}>
          <TextField label="how many?" value={quantity} onChangeText={setQuantity} keyboardType="number-pad" />
        </View>
        <View style={styles.rowItem}>
          <TextField label="unit" value={unit} onChangeText={setUnit} placeholder="pairs, cans, items" />
        </View>
      </View>

      <DateTimeField
        label="drop-off starts"
        value={startsAt}
        onChange={(next) => {
          setStartsAt(next);
          // Keep the window's length when the start moves past the end.
          if (next >= endsAt) setEndsAt(new Date(next.getTime() + (endsAt.getTime() - startsAt.getTime())));
        }}
      />
      <DateTimeField label="drop-off ends" value={endsAt} onChange={setEndsAt} />

      <ToggleRow
        label="repeat every week"
        hint="after this drop-off ends, we’ll post next week’s at the same day and time. stops by itself after 3 weeks in a row with no pledges."
        value={repeatsWeekly}
        onChange={setRepeatsWeekly}
      />

      {error ? <ErrorText>{error}</ErrorText> : null}
      <Button label={need ? 'save changes' : 'post need'} onPress={submit} loading={save.isPending} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.one },
  row: { flexDirection: 'row', gap: Spacing.three },
  rowItem: { flex: 1 },
});
