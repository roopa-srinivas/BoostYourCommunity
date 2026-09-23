import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useCancelPledge, useMyPledges, type MyPledge } from '@/api/pledges';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorText, Loading } from '@/components/ui/message';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { confirm } from '@/lib/confirm';
import { openDirections } from '@/lib/directions';
import { errorMessage, formatWindow } from '@/lib/format';
import { PLEDGE_STATUS } from '@/lib/labels';

export default function MyPledgesScreen() {
  const pledges = useMyPledges();
  const cancelPledge = useCancelPledge();

  if (pledges.isPending) return <Loading />;

  const upcoming = (pledges.data ?? []).filter((pledge) => pledge.status === 'pledged');
  const past = (pledges.data ?? []).filter((pledge) => pledge.status !== 'pledged');

  async function cancel(pledge: MyPledge) {
    const ok = await confirm(
      'Cancel this pledge?',
      `The organization will stop expecting your ${pledge.quantity} ${pledge.need?.unit ?? 'items'}.`,
      'Cancel pledge',
    );
    if (ok) cancelPledge.mutate(pledge.id);
  }

  return (
    <Screen refreshing={pledges.isRefetching} onRefresh={pledges.refetch}>
      {pledges.error ? <ErrorText>{errorMessage(pledges.error)}</ErrorText> : null}
      {cancelPledge.error ? <ErrorText>{errorMessage(cancelPledge.error)}</ErrorText> : null}

      <ThemedText type="smallBold">Upcoming drop-offs</ThemedText>
      {upcoming.length === 0 ? (
        <>
          <EmptyState title="Nothing to drop off" body="Find a need nearby and pledge what you can bring." />
          <Button variant="secondary" label="Find needs nearby" onPress={() => router.navigate('/')} />
        </>
      ) : (
        upcoming.map((pledge) => (
          <PledgeCard key={pledge.id} pledge={pledge}>
            <View style={styles.actions}>
              {pledge.need?.organization ? (
                <Button
                  variant="secondary"
                  label="Directions"
                  style={styles.action}
                  onPress={() => openDirections(pledge.need!.organization!.address)}
                />
              ) : null}
              <Button
                variant="danger"
                label="Cancel"
                style={styles.action}
                loading={cancelPledge.isPending && cancelPledge.variables === pledge.id}
                onPress={() => cancel(pledge)}
              />
            </View>
          </PledgeCard>
        ))
      )}

      {past.length > 0 ? (
        <>
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            Past pledges
          </ThemedText>
          {past.map((pledge) => (
            <PledgeCard key={pledge.id} pledge={pledge} />
          ))}
        </>
      ) : null}
    </Screen>
  );
}

function PledgeCard({ pledge, children }: { pledge: MyPledge; children?: React.ReactNode }) {
  const status = PLEDGE_STATUS[pledge.status];
  const need = pledge.need;
  return (
    <Card>
      <Badge label={status.label} tone={status.tone} />
      <ThemedText type="smallBold" style={styles.title}>
        {pledge.quantity} {need?.unit} · {need?.title}
      </ThemedText>
      {need?.organization ? (
        <ThemedText type="small" themeColor="textSecondary">
          {need.organization.name}, {need.organization.address}
        </ThemedText>
      ) : null}
      {need ? (
        <ThemedText type="small" themeColor="textSecondary">
          Drop off {formatWindow(need.dropoff_starts_at, need.dropoff_ends_at)}
        </ThemedText>
      ) : null}
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { marginTop: Spacing.three },
  title: { marginTop: Spacing.one },
  actions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two },
  action: { flex: 1 },
});
