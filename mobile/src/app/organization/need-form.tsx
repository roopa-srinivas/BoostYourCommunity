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
import { Spacing } from '@/constants/theme';
import type { Tables } from '@/lib/database.types';
import { errorMessage } from '@/lib/format';
import { goBackOr } from '@/lib/navigation';
import { CATEGORIES, type NeedCategory } from '@/lib/labels';

/** Post a new need (`organizationId` param) or edit one (`needId` param). */
export default function NeedFormScreen() {
  const { organizationId, needId } = useLocalSearchParams<{ organizationId?: string; needId?: string }>();
  const existing = useNeed(needId);

  if (needId && existing.isPending) return <Loading />;
  if (needId && !existing.data) {
    return (
      <Screen>
        <ErrorText>{existing.error ? errorMessage(existing.error) : 'This need could not be found.'}</ErrorText>
      </Screen>
    );
  }

  const orgId = existing.data?.organization_id ?? organizationId;
  if (!orgId) {
    return (
      <Screen>
        <ErrorText>Missing organization.</ErrorText>
      </Screen>
    );
  }
  return <NeedForm organizationId={orgId} need={existing.data} />;
}

function nextHour() {
  const date = new Date();
  date.setHours(date.getHours() + 1, 0, 0, 0);
  return date;
}

function NeedForm({ organizationId, need }: { organizationId: string; need?: Tables<'needs'> }) {
  const save = useSaveNeed();
  const [category, setCategory] = useState<NeedCategory>(need?.category ?? 'food');
  const [title, setTitle] = useState(need?.title ?? '');
  const [details, setDetails] = useState(need?.details ?? '');
  const [quantity, setQuantity] = useState(need ? String(need.quantity_needed) : '');
  const [unit, setUnit] = useState(need?.unit ?? 'items');
  const [startsAt, setStartsAt] = useState(() => (need ? new Date(need.dropoff_starts_at) : nextHour()));
  const [endsAt, setEndsAt] = useState(() =>
    need ? new Date(need.dropoff_ends_at) : new Date(nextHour().getTime() + 3 * 3_600_000),
  );
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    const quantityNeeded = Number(quantity);
    if (title.trim().length < 3) return setError('Give the need a short title, like “New socks, adult sizes”.');
    if (!Number.isInteger(quantityNeeded) || quantityNeeded < 1) return setError('Enter how many you need.');
    if (!unit.trim()) return setError('Enter a unit, like “pairs” or “cans”.');
    if (endsAt <= startsAt) return setError('The drop-off window has to end after it starts.');
    if (endsAt <= new Date()) return setError('The drop-off window has to end in the future.');

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
        },
      });
      if (need) goBackOr({ pathname: '/organization/need/[id]', params: { id } });
      else router.replace({ pathname: '/organization/need/[id]', params: { id } });
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: need ? 'Edit need' : 'Post a need' }} />

      <View style={styles.field}>
        <ThemedText type="smallBold">Category</ThemedText>
        <ChipGroup options={CATEGORIES} value={category} onChange={setCategory} />
      </View>
      <TextField
        label="What do you need?"
        value={title}
        onChangeText={setTitle}
        placeholder="New socks, adult sizes"
        hint="Be specific so donors bring the right thing."
      />
      <TextField
        label="Details (optional)"
        value={details}
        onChangeText={setDetails}
        multiline
        placeholder="Sizes, brands, what you can't accept…"
      />
      <View style={styles.row}>
        <View style={styles.rowItem}>
          <TextField label="How many?" value={quantity} onChangeText={setQuantity} keyboardType="number-pad" />
        </View>
        <View style={styles.rowItem}>
          <TextField label="Unit" value={unit} onChangeText={setUnit} placeholder="pairs, cans, items" />
        </View>
      </View>

      <DateTimeField
        label="Drop-off starts"
        value={startsAt}
        onChange={(next) => {
          setStartsAt(next);
          // Keep the window's length when the start moves past the end.
          if (next >= endsAt) setEndsAt(new Date(next.getTime() + (endsAt.getTime() - startsAt.getTime())));
        }}
      />
      <DateTimeField label="Drop-off ends" value={endsAt} onChange={setEndsAt} />

      {error ? <ErrorText>{error}</ErrorText> : null}
      <Button label={need ? 'Save changes' : 'Post need'} onPress={submit} loading={save.isPending} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.one },
  row: { flexDirection: 'row', gap: Spacing.three },
  rowItem: { flex: 1 },
});
