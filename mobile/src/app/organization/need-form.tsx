import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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
import { deleteDraft, getDraft, newDraftId, saveDraft, type NeedDraft } from '@/lib/need-drafts';
import { CATEGORIES, type NeedCategory } from '@/lib/labels';
import { describeRepeat, REPEAT_OPTIONS, type RepeatFrequency } from '@/lib/repeat';

/**
 * Post a new need (`organizationId` param), edit one (`needId`), or post a
 * past need again with new dates (`copyFrom`).
 */
export default function NeedFormScreen() {
  const { organizationId, needId, copyFrom, draftId } = useLocalSearchParams<{
    organizationId?: string;
    needId?: string;
    copyFrom?: string;
    /** Continue an unfinished post saved on this device. */
    draftId?: string;
  }>();
  const existing = useNeed(needId ?? copyFrom);
  const [draft] = useState(() => (draftId && organizationId ? getDraft(organizationId, draftId) : null));

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
  if (needId) return <NeedForm organizationId={orgId} need={existing.data} />;
  if (draft) return <NeedForm organizationId={orgId} draft={draft} />;
  return <NeedForm organizationId={orgId} template={existing.data} />;
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

type Fields = NeedDraft['fields'];

/** Where the form starts: an existing need, a draft, a copy of a past need, or empty. */
function startingFields({ need, draft, template }: { need?: Tables<'needs'>; draft?: NeedDraft; template?: Tables<'needs'> }): Fields {
  if (draft) return draft.fields;
  const source = need ?? template;
  const copied = template ? nextWindow(template.dropoff_starts_at, template.dropoff_ends_at) : null;
  const start = need ? new Date(need.dropoff_starts_at) : (copied?.start ?? nextHour());
  const end = need
    ? new Date(need.dropoff_ends_at)
    : (copied?.end ?? new Date(start.getTime() + 3 * 3_600_000));
  return {
    category: source?.category ?? 'food',
    title: source?.title ?? '',
    details: source?.details ?? '',
    quantity: source ? String(source.quantity_needed) : '',
    unit: source?.unit ?? 'items',
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    // Editing keeps the current setting; a new need or a copy starts one-off.
    repeat: need?.repeat_frequency ?? null,
  };
}

const DRAFT_SAVE_DELAY_MS = 400;

function NeedForm({
  organizationId,
  need,
  template,
  draft,
}: {
  organizationId: string;
  /** The need being edited. */
  need?: Tables<'needs'>;
  /** A past need to post again as a new one. */
  template?: Tables<'needs'>;
  /** An unfinished post being continued. */
  draft?: NeedDraft;
}) {
  const [initial] = useState(() => startingFields({ need, draft, template }));
  const save = useSaveNeed();
  const [category, setCategory] = useState<NeedCategory>(initial.category);
  const [title, setTitle] = useState(initial.title);
  const [details, setDetails] = useState(initial.details);
  const [quantity, setQuantity] = useState(initial.quantity);
  const [unit, setUnit] = useState(initial.unit);
  const [repeat, setRepeat] = useState<RepeatFrequency | null>(initial.repeat);
  const [startsAt, setStartsAt] = useState(() => new Date(initial.startsAt));
  const [endsAt, setEndsAt] = useState(() => new Date(initial.endsAt));

  // Drafts: new posts only (an edited need already exists). Saved shortly
  // after each change while the form differs from where it started, so
  // leaving the screen any way at all keeps the work.
  const draftsEnabled = !need;
  const draftIdRef = useRef<string | null>(draft?.id ?? null);
  const [draftSaved, setDraftSaved] = useState(!!draft);
  const current: Fields = {
    category,
    title,
    details,
    quantity,
    unit,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    repeat,
  };
  const currentKey = JSON.stringify(current);
  const changed = currentKey !== JSON.stringify(initial);

  useEffect(() => {
    if (!draftsEnabled) return;
    const timer = setTimeout(() => {
      if (changed) {
        draftIdRef.current ??= newDraftId();
        saveDraft(organizationId, {
          id: draftIdRef.current,
          updatedAt: new Date().toISOString(),
          copiedFrom: draft?.copiedFrom ?? template?.id ?? null,
          fields: JSON.parse(currentKey) as Fields,
        });
        setDraftSaved(true);
      } else if (draftIdRef.current && !draft) {
        // Back to where a fresh form started: nothing worth keeping.
        deleteDraft(organizationId, draftIdRef.current);
        draftIdRef.current = null;
        setDraftSaved(false);
      }
    }, DRAFT_SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [currentKey, changed, draftsEnabled, organizationId, draft, template]);

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
          repeat_frequency: repeat,
        },
      });
      if (need) {
        goBackOr({ pathname: '/organization/need/[id]', params: { id } });
      } else {
        if (draftIdRef.current) deleteDraft(organizationId, draftIdRef.current);
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
      <Stack.Screen options={{ title: need ? 'edit need' : template || draft?.copiedFrom ? 'post again' : 'post a need' }} />
      {draftsEnabled && draftSaved ? (
        <ThemedText type="small" themeColor="textSecondary">
          saved as a draft on this device. you’ll find it under post a need if you leave.
        </ThemedText>
      ) : null}
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

      <View style={styles.field}>
        <ThemedText type="smallBold">repeat</ThemedText>
        <ChipGroup
          scroll
          options={REPEAT_OPTIONS}
          value={repeat ?? 'none'}
          onChange={(value) => setRepeat(value === 'none' ? null : value)}
        />
        <ThemedText type="small" themeColor="textSecondary">
          {repeat
            ? `${describeRepeat(repeat, startsAt)}, at the same time. we post the next one after each drop-off ends, and stop by ourselves if nobody pledges ${repeat === 'daily' ? '7 days' : '3 times'} in a row.`
            : 'post it once. you can always post it again later.'}
        </ThemedText>
      </View>

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
