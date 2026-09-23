import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useNeed, useSetNeedStatus, useStopRepeating } from '@/api/needs';
import { useNeedPledges, useResolvePledge } from '@/api/pledges';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorText, Loading } from '@/components/ui/message';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { confirm } from '@/lib/confirm';
import { formatCheckinCode } from '@/lib/checkin';
import { errorMessage, formatDay, formatQuantity, formatTime, formatWindow, lower } from '@/lib/format';
import { NEED_STATUS, PLEDGE_STATUS } from '@/lib/labels';
import { describeRepeat } from '@/lib/repeat';

export default function StaffNeedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const need = useNeed(id);
  const pledges = useNeedPledges(id);
  const resolve = useResolvePledge();
  const setStatus = useSetNeedStatus();
  const stopRepeating = useStopRepeating();
  // Read the clock once when the screen opens, not on every render.
  const [now] = useState(() => Date.now());

  if (need.isPending) return <Loading />;
  if (!need.data) {
    return (
      <Screen>
        <ErrorText>{need.error ? errorMessage(need.error) : 'this need could not be found.'}</ErrorText>
      </Screen>
    );
  }

  const { data } = need;
  // Same wording as the organization tab: an open need whose window has passed is "ended".
  const ended = data.status === 'open' && new Date(data.dropoff_ends_at).getTime() <= now;
  const status = ended ? { label: 'ended', tone: 'neutral' as const } : NEED_STATUS[data.status];
  const all = pledges.data ?? [];
  const received = all.filter((p) => p.status === 'received').reduce((sum, p) => sum + p.quantity, 0);
  const expected = all.filter((p) => p.status === 'pledged');
  const resolved = all.filter((p) => p.status !== 'pledged');

  async function close() {
    const ok = await confirm(
      'stop taking pledges?',
      'donors won’t see this need anymore. you can still confirm drop-offs that were already pledged.',
      'close need',
    );
    if (ok) setStatus.mutate({ needId: data.id, status: 'closed' });
  }

  const mutationError = resolve.error ?? setStatus.error ?? stopRepeating.error;

  return (
    <Screen onRefresh={() => Promise.all([need.refetch(), pledges.refetch()])}>
      <Stack.Screen options={{ title: lower(data.title) }} />

      <Card>
        <Badge label={status.label} tone={status.tone} />
        <ThemedText type="sectionTitle" style={styles.title}>
          {lower(data.title)}
        </ThemedText>
        <ThemedText type="small">
          {data.quantity_committed} of {data.quantity_needed} {data.unit} pledged · {received} received
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          drop off {formatWindow(data.dropoff_starts_at, data.dropoff_ends_at)}
        </ThemedText>
        <View style={styles.actions}>
          <Button
            variant="secondary"
            label="edit"
            style={styles.action}
            onPress={() => router.push({ pathname: '/organization/need-form', params: { needId: data.id } })}
          />
          {data.status === 'open' ? (
            <Button variant="danger" label="close" style={styles.action} onPress={close} loading={setStatus.isPending} />
          ) : (
            <Button
              variant="secondary"
              label="reopen"
              style={styles.action}
              loading={setStatus.isPending}
              onPress={() => setStatus.mutate({ needId: data.id, status: 'open' })}
            />
          )}
        </View>
        {/* Its own full-width row: three buttons squeezed the label onto two lines on phones.
            Once a need is over, posting it again is the likely next step, so it's the main action. */}
        <Button
          variant={ended || data.status !== 'open' ? 'primary' : 'secondary'}
          label="post again"
          style={styles.fullWidth}
          onPress={() => router.push({ pathname: '/organization/need-form', params: { copyFrom: data.id } })}
        />
        {data.repeat_frequency ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.repeat}>
            repeats {describeRepeat(data.repeat_frequency, new Date(data.dropoff_starts_at))} ·{' '}
            <ThemedText
              type="link"
              accessibilityRole="button"
              onPress={async () => {
                const ok = await confirm(
                  'stop repeating?',
                  'this one stays up, but the next one won’t be posted.',
                  'stop repeating',
                );
                if (ok) stopRepeating.mutate(data.id);
              }}>
              stop repeating
            </ThemedText>
          </ThemedText>
        ) : null}
      </Card>

      {mutationError ? <ErrorText>{errorMessage(mutationError)}</ErrorText> : null}
      {pledges.error ? <ErrorText>{errorMessage(pledges.error)}</ErrorText> : null}

      <ThemedText type="sectionTitle" style={styles.sectionTitle}>
        expected drop-offs
      </ThemedText>
      {pledges.isPending ? (
        <Loading />
      ) : expected.length === 0 ? (
        <EmptyState title="no pledges waiting" body="when donors pledge, they’ll show up here." />
      ) : (
        expected.map((pledge) => (
          <PledgeRow key={pledge.id} pledge={pledge} unit={data.unit}>
            <View style={styles.actions}>
              <Button
                label="received"
                style={styles.action}
                disabled={resolve.isPending}
                onPress={() => resolve.mutate({ pledgeId: pledge.id, outcome: 'received' })}
              />
              <Button
                variant="secondary"
                label="didn’t arrive"
                style={styles.action}
                disabled={resolve.isPending}
                onPress={() => resolve.mutate({ pledgeId: pledge.id, outcome: 'no_show' })}
              />
            </View>
          </PledgeRow>
        ))
      )}

      {resolved.length > 0 ? (
        <>
          <ThemedText type="sectionTitle" style={styles.sectionTitle}>
            resolved
          </ThemedText>
          {resolved.map((pledge) => (
            <PledgeRow key={pledge.id} pledge={pledge} unit={data.unit}>
              {pledge.status === 'received' || pledge.status === 'no_show' ? (
                <Button
                  variant="secondary"
                  label={pledge.status === 'received' ? 'mark as didn’t arrive' : 'mark as received'}
                  style={styles.correction}
                  disabled={resolve.isPending}
                  onPress={() =>
                    resolve.mutate({
                      pledgeId: pledge.id,
                      outcome: pledge.status === 'received' ? 'no_show' : 'received',
                    })
                  }
                />
              ) : null}
            </PledgeRow>
          ))}
        </>
      ) : null}
    </Screen>
  );
}

type Pledge = NonNullable<ReturnType<typeof useNeedPledges>['data']>[number];

function PledgeRow({ pledge, unit, children }: { pledge: Pledge; unit: string; children?: React.ReactNode }) {
  const status = PLEDGE_STATUS[pledge.status];
  const createdAt = new Date(pledge.created_at);
  return (
    <Card>
      <View style={styles.rowHeader}>
        <ThemedText type="smallBold">
          {pledge.donor?.display_name ?? 'a donor'} · {formatQuantity(pledge.quantity, unit)}
        </ThemedText>
        <Badge label={status.label} tone={status.tone} />
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        pledged {formatDay(createdAt)} at {formatTime(createdAt)} · code {formatCheckinCode(pledge.checkin_code)}
      </ThemedText>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: Spacing.one },
  sectionTitle: { marginTop: Spacing.two },
  actions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two },
  action: { flex: 1 },
  fullWidth: { marginTop: Spacing.two },
  repeat: { marginTop: Spacing.two, textAlign: 'center' },
  correction: { marginTop: Spacing.two, alignSelf: 'flex-start', minHeight: 36 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
});
