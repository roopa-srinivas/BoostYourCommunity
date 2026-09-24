import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NEARBY_RADIUS_METERS, useFollowedNeeds, useNearbyNeeds } from '@/api/needs';
import { useFollowedOrganizationIds } from '@/api/organizations';
import { useProfile } from '@/api/profile';
import { NeedCard } from '@/components/need-card';
import { NeedsMap } from '@/components/needs-map';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ChipGroup } from '@/components/ui/chip';
import { EmptyState, ErrorText, Loading } from '@/components/ui/message';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { SAN_FRANCISCO, useUserLocation } from '@/hooks/use-user-location';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage, formatDistance, lower } from '@/lib/format';
import { CATEGORIES, type NeedCategory } from '@/lib/labels';
import { NEED_SORTS, sortNeeds, type NeedSort } from '@/lib/urgency';

const FOLLOWED_PREVIEW = 3;

const CATEGORY_FILTERS = [{ value: 'all' as const, label: 'anything' }, ...CATEGORIES];

export default function GiveScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const profile = useProfile();
  const userLocation = useUserLocation();
  const [showSanFrancisco, setShowSanFrancisco] = useState(false);
  const [category, setCategory] = useState<NeedCategory | 'all'>('all');
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [sort, setSort] = useState<NeedSort>('nearest');

  const center =
    showSanFrancisco || userLocation.status === 'unavailable' ? SAN_FRANCISCO : userLocation.location;
  const needs = useNearbyNeeds(center, category === 'all' ? null : category);
  const followedIds = useFollowedOrganizationIds();
  const followedNeeds = useFollowedNeeds(followedIds.data, category === 'all' ? null : category);
  const [showAllFollowed, setShowAllFollowed] = useState(false);
  const following = (followedIds.data?.size ?? 0) > 0;
  const followedList = (followedNeeds.data ?? []).map((need) => ({
    ...need,
    distance_m: needs.data?.find((nearby) => nearby.need_id === need.need_id)?.distance_m ?? null,
  }));
  const shownFollowed = showAllFollowed ? followedList : followedList.slice(0, FOLLOWED_PREVIEW);

  const visibleNeeds = sortNeeds(
    (needs.data ?? []).filter((need) => !selectedOrganizationId || need.organization_id === selectedOrganizationId),
    sort,
  );
  const selectedOrganizationName = lower(visibleNeeds[0]?.organization_name);

  let where = 'finding your location…';
  if (showSanFrancisco) where = 'san francisco';
  else if (userLocation.status === 'found') where = 'near you';
  else if (userLocation.status === 'unavailable') where = 'san francisco (location is off)';

  const firstName = lower(profile.data?.display_name.split(' ')[0]);

  return (
    <Screen
      onRefresh={() => Promise.all([needs.refetch(), followedIds.refetch(), followedNeeds.refetch()])}
      // No header here, so handle the top safe area ourselves on every platform.
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={{ paddingTop: insets.top + Spacing.four }}>
      <View style={styles.header}>
        <View style={styles.where}>
          <SymbolView
            name={{ ios: 'location.fill', android: 'location_on', web: 'location_on' }}
            size={14}
            tintColor={theme.textSecondary}
          />
          <ThemedText type="small" themeColor="textSecondary">
            {firstName ? `hi ${firstName} · ${where}` : where}
          </ThemedText>
        </View>
        <ThemedText type="title">i’m here to help my community by giving…</ThemedText>
      </View>

      <ChipGroup
        scroll
        options={CATEGORY_FILTERS}
        value={category}
        onChange={(next) => {
          setCategory(next);
          setSelectedOrganizationId(null);
        }}
      />

      {userLocation.status === 'locating' && !showSanFrancisco ? (
        <Button variant="secondary" label="see san francisco instead" onPress={() => setShowSanFrancisco(true)} />
      ) : null}

      {following ? (
        <View style={styles.followed}>
          <View style={styles.sectionHeader}>
            <ThemedText type="sectionTitle">from places you follow</ThemedText>
            {followedList.length > FOLLOWED_PREVIEW ? (
              <ThemedText
                type="link"
                accessibilityRole="button"
                onPress={() => setShowAllFollowed((all) => !all)}>
                {showAllFollowed ? 'show less' : `see all ${followedList.length}`}
              </ThemedText>
            ) : null}
          </View>
          {followedNeeds.error ? <ErrorText>{errorMessage(followedNeeds.error)}</ErrorText> : null}
          {followedNeeds.isPending ? (
            <Loading />
          ) : followedList.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              nothing open from them{category === 'all' ? '' : ' in this category'} right now.
            </ThemedText>
          ) : (
            shownFollowed.map((need) => (
              <NeedCard
                key={need.need_id}
                need={need}
                onPress={() => router.push({ pathname: '/need/[id]', params: { id: need.need_id } })}
              />
            ))
          )}
        </View>
      ) : null}

      {center ? (
        <NeedsMap
          center={center}
          needs={needs.data ?? []}
          selectedOrganizationId={selectedOrganizationId}
          onSelectOrganization={setSelectedOrganizationId}
        />
      ) : null}

      <View style={styles.sectionHeader}>
        {selectedOrganizationName && selectedOrganizationId ? (
          <ThemedText
            type="sectionTitle"
            themeColor="tint"
            accessibilityRole="link"
            accessibilityHint="opens the organization's page"
            onPress={() => router.push({ pathname: '/org/[id]', params: { id: selectedOrganizationId } })}>
            {selectedOrganizationName} ›
          </ThemedText>
        ) : (
          <ThemedText type="sectionTitle">needs near you</ThemedText>
        )}
        {needs.data ? (
          <ThemedText type="small" themeColor="textSecondary">
            {visibleNeeds.length} open
          </ThemedText>
        ) : null}
      </View>

      {selectedOrganizationId ? (
        <Button variant="secondary" label="show everything nearby" onPress={() => setSelectedOrganizationId(null)} />
      ) : null}

      {visibleNeeds.length > 1 ? <ChipGroup scroll options={NEED_SORTS} value={sort} onChange={setSort} /> : null}

      {needs.error ? <ErrorText>{errorMessage(needs.error)}</ErrorText> : null}

      {!center || needs.isPending ? (
        <Loading />
      ) : visibleNeeds.length === 0 ? (
        <>
          <EmptyState
            title="nothing open nearby right now"
            body={`no needs within ${formatDistance(NEARBY_RADIUS_METERS)}${category === 'all' ? '' : ' in this category'}. check back soon.`}
          />
          {!showSanFrancisco && userLocation.status === 'found' ? (
            <Button variant="secondary" label="see san francisco instead" onPress={() => setShowSanFrancisco(true)} />
          ) : null}
        </>
      ) : (
        visibleNeeds.map((need) => (
          <NeedCard
            key={need.need_id}
            need={need}
            onPress={() => router.push({ pathname: '/need/[id]', params: { id: need.need_id } })}
          />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.two },
  followed: { gap: Spacing.three },
  where: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: Spacing.one,
  },
});
