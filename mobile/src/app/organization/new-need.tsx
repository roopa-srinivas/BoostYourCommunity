import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
import { confirm } from '@/lib/confirm';
import { errorMessage, formatDay, formatQuantity, formatTime, lower } from '@/lib/format';
import { deleteDraft, listDrafts, type NeedDraft } from '@/lib/need-drafts';
import { repeatBadge, ruleFromNeed } from '@/lib/repeat';

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
 * Back from the form returns here. Organizations without past needs go
 * straight to the empty form.
 */
export default function NewNeedScreen() {
  const { organizationId } = useLocalSearchParams<{ organizationId: string }>();
  const needs = useOrganizationNeeds(organizationId);
  const recent = distinctRecent(needs.data ?? []);
  const [drafts, setDrafts] = useState<NeedDraft[] | null>(null);

  // Re-read drafts whenever this screen comes back into view (a draft was
  // just saved or posted).
  useFocusEffect(
    useCallback(() => {
      setDrafts(listDrafts(organizationId));
    }, [organizationId]),
  );

  const nothingToReuse = needs.isSuccess && drafts !== null && recent.length === 0 && drafts.length === 0;

  // Push, so backing out of the form returns here to choose again.
  const startNew = () => router.push({ pathname: '/organization/need-form', params: { organizationId } });

  // Nothing to choose from: go straight to the empty form (replace, so back
  // doesn't land on an empty chooser).
  useEffect(() => {
    if (nothingToReuse) router.replace({ pathname: '/organization/need-form', params: { organizationId } });
  }, [nothingToReuse, organizationId]);

  if (needs.isPending || drafts === null || nothingToReuse) return <Loading />;

  async function removeDraft(draft: NeedDraft) {
    const ok = await confirm(
      'delete this draft?',
      `“${lower(draft.fields.title) || 'untitled'}” will be gone for good.`,
      'delete draft',
    );
    if (!ok) return;
    deleteDraft(organizationId, draft.id);
    setDrafts(listDrafts(organizationId));
  }

  return (
    <Screen>
      {needs.error ? <ErrorText>{errorMessage(needs.error)}</ErrorText> : null}
      {drafts.length > 0 ? (
        <View style={styles.draftSection}>
          <ThemedText type="sectionTitle">your drafts</ThemedText>
          {drafts.map((draft) => {
            const saved = new Date(draft.updatedAt);
            return (
              <Card key={draft.id} style={styles.draftCard}>
                <ThemedText type="bold" numberOfLines={1}>
                  {lower(draft.fields.title) || 'untitled need'}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {draft.fields.quantity ? `${draft.fields.quantity} ${draft.fields.unit} · ` : ''}saved{' '}
                  {formatDay(saved)} at {formatTime(saved)}
                </ThemedText>
                <View style={styles.draftActions}>
                  <Button
                    label="continue"
                    style={styles.flex}
                    onPress={() =>
                      router.push({ pathname: '/organization/need-form', params: { organizationId, draftId: draft.id } })
                    }
                  />
                  <Button variant="danger" label="delete" style={styles.flex} onPress={() => removeDraft(draft)} />
                </View>
              </Card>
            );
          })}
        </View>
      ) : null}

      <Button label="something new" variant={drafts.length > 0 ? 'secondary' : 'primary'} onPress={startNew} />

      {recent.length > 0 ? (
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
              onPress={() => router.push({ pathname: '/organization/need-form', params: { copyFrom: need.id } })}>
              <CategoryIcon category={need.category} size={36} />
              <View style={styles.flex}>
                <ThemedText type="bold" numberOfLines={1}>
                  {lower(need.title)}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {formatQuantity(need.quantity_needed, need.unit)} · last posted for{' '}
                  {formatDay(new Date(need.dropoff_starts_at))}
                  {need.repeat_unit ? ` · ${repeatBadge(ruleFromNeed(need)!)}` : ''}
                </ThemedText>
              </View>
              <ThemedText type="bold" themeColor="tint">
                ›
              </ThemedText>
            </Card>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two, marginTop: Spacing.three },
  card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two + 4 },
  flex: { flex: 1 },
  draftSection: { gap: Spacing.two, marginBottom: Spacing.three },
  draftCard: { gap: Spacing.one },
  draftActions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two },
});
