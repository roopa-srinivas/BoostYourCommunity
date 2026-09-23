import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { useOrganizationNeeds } from '@/api/needs';
import { useOrganization } from '@/api/organizations';
import { CategoryIcon } from '@/components/category-icon';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorText, Loading } from '@/components/ui/message';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { openDirections } from '@/lib/directions';
import { errorMessage, formatQuantity, formatWindow, lower } from '@/lib/format';
import { ORGANIZATION_KINDS } from '@/lib/labels';
import { formatClosesIn, isClosingSoon } from '@/lib/urgency';

/** An organization's public page: who they are, what they take, and what they need now. */
export default function OrganizationPageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const organization = useOrganization(id);
  const needs = useOrganizationNeeds(id);
  // Read the clock once when the page opens, not on every render.
  const [now] = useState(() => Date.now());

  if (organization.isPending) return <Loading />;
  if (!organization.data) {
    return (
      <Screen>
        <ErrorText>{organization.error ? errorMessage(organization.error) : 'this organization could not be found.'}</ErrorText>
      </Screen>
    );
  }

  const org = organization.data;
  const kind = ORGANIZATION_KINDS.find((k) => k.value === org.kind)?.label ?? org.kind;
  const openNeeds = (needs.data ?? []).filter(
    (n) => n.status === 'open' && new Date(n.dropoff_ends_at).getTime() > now && n.quantity_committed < n.quantity_needed,
  );
  const website = org.website && !/^https?:\/\//i.test(org.website) ? `https://${org.website}` : org.website;

  return (
    <Screen refreshing={organization.isRefetching || needs.isRefetching} onRefresh={() => {
      organization.refetch();
      needs.refetch();
    }}>
      <Stack.Screen options={{ title: '' }} />

      <View style={styles.hero}>
        <ThemedText type="small" themeColor="textSecondary">
          {kind}
        </ThemedText>
        <ThemedText type="subtitle">{lower(org.name)}</ThemedText>
        {org.description ? <ThemedText themeColor="textSecondary">{lower(org.description)}</ThemedText> : null}
      </View>

      <Card style={styles.card}>
        <InfoRow label="address" value={lower(org.address)} />
        {org.hours ? <InfoRow label="hours" value={lower(org.hours)} /> : null}
        {org.phone ? (
          <InfoRow label="phone" value={org.phone} onPress={() => Linking.openURL(`tel:${org.phone!.replace(/[^\d+]/g, '')}`)} />
        ) : null}
        {website ? <InfoRow label="website" value={lower(org.website)} onPress={() => WebBrowser.openBrowserAsync(website)} /> : null}
        <Button variant="secondary" label="get directions" onPress={() => openDirections(org.address)} />
      </Card>

      {org.accepts ? (
        <View style={[styles.policy, { backgroundColor: theme.tintSoft }]}>
          <ThemedText type="smallBold" themeColor="tint">
            they accept
          </ThemedText>
          <ThemedText>{lower(org.accepts)}</ThemedText>
        </View>
      ) : null}
      {org.does_not_accept ? (
        <View style={[styles.policy, { backgroundColor: theme.accentSoft }]}>
          <ThemedText type="smallBold" themeColor="accent">
            please don’t bring
          </ThemedText>
          <ThemedText>{lower(org.does_not_accept)}</ThemedText>
        </View>
      ) : null}

      <ThemedText type="sectionTitle" style={styles.sectionTitle}>
        what they need now
      </ThemedText>
      {needs.error ? <ErrorText>{errorMessage(needs.error)}</ErrorText> : null}
      {needs.isPending ? (
        <Loading />
      ) : openNeeds.length === 0 ? (
        <EmptyState title="nothing open right now" body="check back soon." />
      ) : (
        openNeeds.map((need) => {
          const remaining = need.quantity_needed - need.quantity_committed;
          return (
            <Card
              key={need.id}
              style={styles.needCard}
              onPress={() => router.push({ pathname: '/need/[id]', params: { id: need.id } })}>
              <CategoryIcon category={need.category} size={40} />
              <View style={styles.needBody}>
                <ThemedText type="bold">{lower(need.title)}</ThemedText>
                <ProgressBar value={need.quantity_committed / need.quantity_needed} />
                <ThemedText type="small" themeColor="textSecondary">
                  <ThemedText type="smallBold">{formatQuantity(remaining, need.unit)}</ThemedText> still needed ·{' '}
                  {isClosingSoon(need.dropoff_ends_at) ? (
                    <ThemedText type="smallBold" themeColor="accent">
                      {formatClosesIn(need.dropoff_ends_at)}
                    </ThemedText>
                  ) : (
                    formatWindow(need.dropoff_starts_at, need.dropoff_ends_at)
                  )}
                </ThemedText>
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

function InfoRow({ label, value, onPress }: { label: string; value: string; onPress?: () => void }) {
  return (
    <View style={styles.infoRow}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.infoLabel}>
        {label}
      </ThemedText>
      <ThemedText
        type={onPress ? 'link' : 'small'}
        style={styles.infoValue}
        onPress={onPress}
        accessibilityRole={onPress ? 'link' : undefined}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { gap: Spacing.one },
  card: { gap: Spacing.two },
  infoRow: { flexDirection: 'row', gap: Spacing.three },
  infoLabel: { width: 64 },
  infoValue: { flex: 1 },
  policy: { gap: Spacing.one, padding: Spacing.three, borderRadius: Radius.card },
  sectionTitle: { marginTop: Spacing.two },
  needCard: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' },
  needBody: { flex: 1, gap: Spacing.one },
});
