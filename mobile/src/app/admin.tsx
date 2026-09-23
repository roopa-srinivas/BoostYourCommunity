import { StyleSheet, View } from 'react-native';

import { useIsAdmin, useOrganizationsToReview, useSetOrganizationStatus } from '@/api/admin';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorText, Loading } from '@/components/ui/message';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { confirm } from '@/lib/confirm';
import { errorMessage, formatDay, lower } from '@/lib/format';
import { ORGANIZATION_KINDS, ORGANIZATION_STATUS } from '@/lib/labels';

/** Review organizations: approve new ones, suspend or reinstate. Admins only. */
export default function AdminScreen() {
  const isAdmin = useIsAdmin();
  const organizations = useOrganizationsToReview(isAdmin.data === true);
  const setStatus = useSetOrganizationStatus();

  if (isAdmin.isPending) return <Loading />;
  if (!isAdmin.data) {
    return (
      <Screen>
        <EmptyState title="admins only" body="this screen is for people who review organizations." />
      </Screen>
    );
  }

  const all = organizations.data ?? [];
  const pending = all.filter((o) => o.status === 'pending');
  const suspended = all.filter((o) => o.status === 'suspended');

  async function suspend(id: string, name: string) {
    const ok = await confirm(
      'suspend this organization?',
      `${lower(name)} will be hidden from donors and can’t post needs until you reinstate it.`,
      'suspend',
    );
    if (ok) setStatus.mutate({ organizationId: id, status: 'suspended' });
  }

  const busyId = setStatus.isPending ? setStatus.variables?.organizationId : null;

  return (
    <Screen refreshing={organizations.isRefetching} onRefresh={organizations.refetch}>
      <ThemedText type="small" themeColor="textSecondary">
        check that each organization is real before approving it: look it up, and call the phone number if you’re
        unsure. approved organizations appear to donors and can post needs.
      </ThemedText>
      {organizations.error ? <ErrorText>{errorMessage(organizations.error)}</ErrorText> : null}
      {setStatus.error ? <ErrorText>{errorMessage(setStatus.error)}</ErrorText> : null}

      <ThemedText type="sectionTitle">waiting for approval</ThemedText>
      {organizations.isPending ? (
        <Loading />
      ) : pending.length === 0 ? (
        <EmptyState title="nothing to review" body="new organizations will show up here." />
      ) : (
        pending.map((org) => (
          <OrganizationCard key={org.id} org={org}>
            <View style={styles.actions}>
              <Button
                label="approve"
                style={styles.action}
                loading={busyId === org.id}
                disabled={!!busyId}
                onPress={() => setStatus.mutate({ organizationId: org.id, status: 'approved' })}
              />
              <Button
                variant="danger"
                label="suspend"
                style={styles.action}
                disabled={!!busyId}
                onPress={() => suspend(org.id, org.name)}
              />
            </View>
          </OrganizationCard>
        ))
      )}

      {suspended.length > 0 ? (
        <>
          <ThemedText type="sectionTitle" style={styles.sectionGap}>
            suspended
          </ThemedText>
          {suspended.map((org) => (
            <OrganizationCard key={org.id} org={org}>
              <Button
                variant="secondary"
                label="reinstate"
                style={styles.actionTop}
                loading={busyId === org.id}
                disabled={!!busyId}
                onPress={() => setStatus.mutate({ organizationId: org.id, status: 'approved' })}
              />
            </OrganizationCard>
          ))}
        </>
      ) : null}
    </Screen>
  );
}

type Org = NonNullable<ReturnType<typeof useOrganizationsToReview>['data']>[number];

function OrganizationCard({ org, children }: { org: Org; children: React.ReactNode }) {
  const status = ORGANIZATION_STATUS[org.status];
  const kind = ORGANIZATION_KINDS.find((k) => k.value === org.kind)?.label ?? org.kind;
  return (
    <Card style={styles.card}>
      <Badge label={status.label} tone={status.tone} />
      <ThemedText type="bold">{org.name}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {kind} · {org.address}
      </ThemedText>
      {org.description ? <ThemedText type="small">{org.description}</ThemedText> : null}
      {org.phone || org.website ? (
        <ThemedText type="small" themeColor="textSecondary">
          {[org.phone, org.website].filter(Boolean).join(' · ')}
        </ThemedText>
      ) : null}
      <ThemedText type="small" themeColor="textSecondary">
        registered {formatDay(new Date(org.created_at))}
        {org.creator ? ` by ${org.creator.display_name}` : ''}
      </ThemedText>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.one },
  actions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two },
  action: { flex: 1 },
  actionTop: { marginTop: Spacing.two },
  sectionGap: { marginTop: Spacing.three },
});
