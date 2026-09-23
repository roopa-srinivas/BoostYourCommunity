import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useCancelPledge, useMyPledges, type MyPledge } from '@/api/pledges';
import { ThemedText } from '@/components/themed-text';
import { CheckinCode } from '@/components/checkin-code';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorText, Loading } from '@/components/ui/message';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { confirm } from '@/lib/confirm';
import { openDirections } from '@/lib/directions';
import { errorMessage, formatQuantity, formatWindow, lower } from '@/lib/format';
import { PLEDGE_STATUS } from '@/lib/labels';

export default function MyPledgesScreen() {
  const pledges = useMyPledges();
  const cancelPledge = useCancelPledge();

  if (pledges.isPending) return <Loading />;

  const upcoming = (pledges.data ?? []).filter((pledge) => pledge.status === 'pledged');
  const past = (pledges.data ?? []).filter((pledge) => pledge.status !== 'pledged');

  async function cancel(pledge: MyPledge) {
    const ok = await confirm(
      'cancel this pledge?',
      `the organization will stop expecting your ${formatQuantity(pledge.quantity, pledge.need?.unit ?? 'items')}.`,
      'cancel pledge',
    );
    if (ok) cancelPledge.mutate(pledge.id);
  }

  return (
    <Screen refreshing={pledges.isRefetching} onRefresh={pledges.refetch}>
      {pledges.error ? <ErrorText>{errorMessage(pledges.error)}</ErrorText> : null}
      {cancelPledge.error ? <ErrorText>{errorMessage(cancelPledge.error)}</ErrorText> : null}

      <ThemedText type="sectionTitle">upcoming drop-offs</ThemedText>
      {upcoming.length === 0 ? (
        <>
          <EmptyState title="nothing to drop off" body="find a need nearby and pledge what you can bring." />
          <Button variant="secondary" label="find needs nearby" onPress={() => router.navigate('/')} />
        </>
      ) : (
        upcoming.map((pledge) => (
          <PledgeCard key={pledge.id} pledge={pledge}>
            <CheckinCode code={pledge.checkin_code} />
            <View style={styles.actions}>
              {pledge.need?.organization ? (
                <Button
                  variant="secondary"
                  label="directions"
                  style={styles.action}
                  onPress={() => openDirections(pledge.need!.organization!.address)}
                />
              ) : null}
              <Button
                variant="danger"
                label="cancel"
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
          <ThemedText type="sectionTitle" style={styles.sectionTitle}>
            past pledges
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
      <ThemedText type="bold" style={styles.title}>
        {formatQuantity(pledge.quantity, need?.unit ?? 'items')} · {lower(need?.title)}
      </ThemedText>
      {need?.organization ? (
        <ThemedText type="small" themeColor="textSecondary">
          {lower(need.organization.name)}, {lower(need.organization.address)}
        </ThemedText>
      ) : null}
      {need ? (
        <ThemedText type="small" themeColor="textSecondary">
          drop off {formatWindow(need.dropoff_starts_at, need.dropoff_ends_at)}
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
