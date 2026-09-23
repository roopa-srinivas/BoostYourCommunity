import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useOrganizationNeeds } from '@/api/needs';
import { useMyOrganizations } from '@/api/organizations';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChipGroup } from '@/components/ui/chip';
import { EmptyState, ErrorText, Loading } from '@/components/ui/message';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import type { Tables } from '@/lib/database.types';
import { errorMessage, formatWindow, lower } from '@/lib/format';
import { NEED_STATUS, ORGANIZATION_STATUS } from '@/lib/labels';

export default function OrganizationScreen() {
  const memberships = useMyOrganizations();
  const [chosenId, setChosenId] = useState<string | null>(null);

  if (memberships.isPending) return <Loading />;

  const organizations = (memberships.data ?? []).flatMap((m) => (m.organization ? [m.organization] : []));
  const organization = organizations.find((o) => o.id === chosenId) ?? organizations[0];
  const isOwner = memberships.data?.some((m) => m.organization?.id === organization?.id && m.role === 'owner') ?? false;

  if (!organization) {
    return (
      <Screen refreshing={memberships.isRefetching} onRefresh={memberships.refetch}>
        {memberships.error ? <ErrorText>{errorMessage(memberships.error)}</ErrorText> : null}
        <ThemedText type="sectionTitle">do you work or volunteer at a shelter, pantry or community fridge?</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          register your organization to post what you need and confirm drop-offs. we review every organization
          before it appears to donors.
        </ThemedText>
        <Button label="register an organization" onPress={() => router.push('/organization/register')} />
      </Screen>
    );
  }

  const status = ORGANIZATION_STATUS[organization.status];

  return (
    <OrganizationNeeds
      organizationId={organization.id}
      header={
        <>
          {organizations.length > 1 ? (
            <ChipGroup
              scroll
              options={organizations.map((o) => ({ value: o.id, label: lower(o.name) }))}
              value={organization.id}
              onChange={setChosenId}
            />
          ) : null}
          <Card>
            <Badge label={status.label} tone={status.tone} />
            <ThemedText type="sectionTitle" style={styles.orgName}>
              {lower(organization.name)}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {lower(organization.address)}
            </ThemedText>
            {organization.status === 'pending' ? (
              <ThemedText type="small" style={styles.note}>
                we’re reviewing your organization. once it’s approved you can post needs and donors nearby will see
                them.
              </ThemedText>
            ) : null}
            {organization.status === 'suspended' ? (
              <ThemedText type="small" style={styles.note}>
                this organization is suspended, so its needs are hidden from donors.
              </ThemedText>
            ) : null}
          </Card>
          {organization.status === 'approved' ? (
            <>
              <Button
                label="check in a drop-off"
                onPress={() => router.push('/organization/checkin')}
              />
              <Button
                variant="secondary"
                label="post a need"
                onPress={() =>
                  router.push({ pathname: '/organization/need-form', params: { organizationId: organization.id } })
                }
              />
            </>
          ) : null}
          <View style={styles.links}>
            {organization.status === 'approved' ? (
              <ThemedText
                type="link"
                accessibilityRole="link"
                onPress={() => router.push({ pathname: '/org/[id]', params: { id: organization.id } })}>
                view your page
              </ThemedText>
            ) : null}
            {isOwner ? (
              <ThemedText
                type="link"
                accessibilityRole="link"
                onPress={() =>
                  router.push({ pathname: '/organization/edit-page', params: { organizationId: organization.id } })
                }>
                edit your page
              </ThemedText>
            ) : null}
          </View>
        </>
      }
    />
  );
}

function OrganizationNeeds({ organizationId, header }: { organizationId: string; header: React.ReactNode }) {
  const needs = useOrganizationNeeds(organizationId);
  const now = new Date();
  const isActive = (need: Tables<'needs'>) => need.status === 'open' && new Date(need.dropoff_ends_at) > now;
  const active = (needs.data ?? []).filter(isActive);
  const past = (needs.data ?? []).filter((need) => !isActive(need)).reverse();

  return (
    <Screen refreshing={needs.isRefetching} onRefresh={needs.refetch}>
      {header}
      {needs.error ? <ErrorText>{errorMessage(needs.error)}</ErrorText> : null}
      {needs.isPending ? (
        <Loading />
      ) : (
        <>
          <ThemedText type="sectionTitle" style={styles.sectionTitle}>
            open needs
          </ThemedText>
          {active.length === 0 ? (
            <EmptyState title="no open needs" body="post a need so donors nearby know what to bring." />
          ) : (
            active.map((need) => <StaffNeedCard key={need.id} need={need} />)
          )}
          {past.length > 0 ? (
            <>
              <ThemedText type="sectionTitle" style={styles.sectionTitle}>
                past needs
              </ThemedText>
              {past.map((need) => (
                <StaffNeedCard key={need.id} need={need} />
              ))}
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}

function StaffNeedCard({ need }: { need: Tables<'needs'> }) {
  const ended = need.status === 'open' && new Date(need.dropoff_ends_at) <= new Date();
  const status = ended ? { label: 'ended', tone: 'neutral' as const } : NEED_STATUS[need.status];
  return (
    <Card onPress={() => router.push({ pathname: '/organization/need/[id]', params: { id: need.id } })}>
      <Badge label={status.label} tone={status.tone} />
      <ThemedText type="bold" style={styles.orgName}>
        {lower(need.title)}
      </ThemedText>
      <ThemedText type="small">
        {need.quantity_committed} of {need.quantity_needed} {need.unit} pledged
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        drop off {formatWindow(need.dropoff_starts_at, need.dropoff_ends_at)}
      </ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  orgName: { marginTop: Spacing.one },
  note: { marginTop: Spacing.two },
  sectionTitle: { marginTop: Spacing.two },
  links: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.four },
});
