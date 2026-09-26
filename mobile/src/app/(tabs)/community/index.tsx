import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { HEAT_WINDOW_DAYS, useCommunityHeat, useFollowCounts, useLeaderboard } from '@/api/community';
import { useProfile } from '@/api/profile';
import { Avatar } from '@/components/avatar';
import { HeatMap } from '@/components/heat-map';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorText, Loading } from '@/components/ui/message';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { SAN_FRANCISCO, useUserLocation } from '@/hooks/use-user-location';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage, lower } from '@/lib/format';

export default function CommunityScreen() {
  const leaderboard = useLeaderboard();
  const userLocation = useUserLocation();
  const [showSanFrancisco, setShowSanFrancisco] = useState(false);
  const center =
    showSanFrancisco || userLocation.status === 'unavailable' ? SAN_FRANCISCO : userLocation.location;
  const heat = useCommunityHeat(center);

  return (
    <Screen title="community" onRefresh={() => Promise.all([leaderboard.refetch(), heat.refetch()])}>
      <Leaderboard query={leaderboard} />
      <Heat
        center={center}
        query={heat}
        locating={userLocation.status === 'locating' && !showSanFrancisco}
        canSwitchToSanFrancisco={!showSanFrancisco && userLocation.status !== 'unavailable'}
        onShowSanFrancisco={() => setShowSanFrancisco(true)}
      />
    </Screen>
  );
}

function Leaderboard({ query }: { query: ReturnType<typeof useLeaderboard> }) {
  const theme = useTheme();
  const followCounts = useFollowCounts();
  const profile = useProfile();
  const rows = query.data ?? [];
  const followsSomeone = (followCounts.data?.following ?? 0) > 0;
  // People can hide their totals, so following someone doesn't mean seeing them here.
  const everyoneHidden = followsSomeone && rows.length === 1;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText type="sectionTitle">this month with friends</ThemedText>
        <ThemedText type="link" onPress={() => router.push('/people')} accessibilityRole="button">
          find people
        </ThemedText>
      </View>
      {query.error ? <ErrorText>{errorMessage(query.error)}</ErrorText> : null}
      {query.isPending ? (
        <Loading />
      ) : (
        <Card style={styles.list}>
          {rows.map((row, index) => (
            <View
              key={row.user_id}
              style={[styles.row, row.is_me && { backgroundColor: theme.tintSoft, borderRadius: 14 }]}>
              <ThemedText type="bold" themeColor="textSecondary" style={styles.rank}>
                {index + 1}
              </ThemedText>
              <Avatar name={row.display_name} size={36} />
              <ThemedText type={row.is_me ? 'bold' : 'default'} style={styles.flex} numberOfLines={1}>
                {row.is_me ? 'you' : row.display_name}
              </ThemedText>
              <ThemedText type="bold">{row.items_given}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {Number(row.items_given) === 1 ? 'item' : 'items'}
              </ThemedText>
            </View>
          ))}
          {profile.data?.hide_from_leaderboard ? (
            <ThemedText type="small" themeColor="textSecondary">
              your total is hidden from your followers. you can change this in profile.
            </ThemedText>
          ) : null}
          {everyoneHidden ? (
            <ThemedText type="small" themeColor="textSecondary">
              the people you follow keep their totals private.
            </ThemedText>
          ) : null}
          {!followsSomeone && !followCounts.isPending ? (
            <EmptyState
              title="it’s just you so far"
              body="follow friends to see how you’re all giving this month. only confirmed drop-offs count."
            />
          ) : null}
        </Card>
      )}
      {!query.isPending && !followCounts.isPending && !followsSomeone ? (
        <Button variant="secondary" label="find people to follow" onPress={() => router.push('/people')} />
      ) : null}
    </View>
  );
}

function Heat({
  center,
  query,
  locating,
  canSwitchToSanFrancisco,
  onShowSanFrancisco,
}: {
  center: ReturnType<typeof useUserLocation>['location'];
  query: ReturnType<typeof useCommunityHeat>;
  locating: boolean;
  canSwitchToSanFrancisco: boolean;
  onShowSanFrancisco: () => void;
}) {
  const spots = query.data ?? [];
  const active = spots.filter((s) => Number(s.items_received) > 0);
  const totalItems = active.reduce((sum, s) => sum + Number(s.items_received), 0);
  const most = Math.max(1, ...active.map((s) => Number(s.items_received)));

  return (
    <View style={styles.section}>
      <ThemedText type="sectionTitle">giving nearby</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        confirmed drop-offs at organizations near you over the last {HEAT_WINDOW_DAYS} days.
      </ThemedText>
      {locating ? (
        <Button variant="secondary" label="see san francisco instead" onPress={onShowSanFrancisco} />
      ) : null}
      {query.error ? <ErrorText>{errorMessage(query.error)}</ErrorText> : null}
      {center ? <HeatMap center={center} spots={spots} /> : null}
      {!center || query.isPending ? (
        <Loading />
      ) : spots.length === 0 ? (
        <>
          <EmptyState title="no organizations nearby yet" />
          {canSwitchToSanFrancisco ? (
            <Button variant="secondary" label="see san francisco instead" onPress={onShowSanFrancisco} />
          ) : null}
        </>
      ) : active.length === 0 ? (
        <EmptyState
          title="no confirmed drop-offs yet"
          body="when organizations confirm donations, you’ll see where your neighbors are giving."
        />
      ) : (
        <Card style={styles.list}>
          <ThemedText>
            <ThemedText type="bold">{totalItems} items</ThemedText> given nearby
          </ThemedText>
          {active.slice(0, 5).map((spot) => (
            <View key={spot.organization_id} style={styles.heatRow}>
              <View style={styles.heatLabel}>
                <ThemedText type="small" style={styles.flex} numberOfLines={1}>
                  {lower(spot.organization_name)}
                </ThemedText>
                <ThemedText type="smallBold">{spot.items_received}</ThemedText>
              </View>
              <ProgressBar value={Number(spot.items_received) / most} />
            </View>
          ))}
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two, marginBottom: Spacing.three },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  list: { gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.two },
  rank: { width: 20, textAlign: 'center' },
  flex: { flex: 1 },
  heatRow: { gap: Spacing.one },
  heatLabel: { flexDirection: 'row', gap: Spacing.two },
});
