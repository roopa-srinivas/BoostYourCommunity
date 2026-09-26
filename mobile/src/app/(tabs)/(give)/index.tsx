import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useFollowedNeeds, useNearbyNeeds } from '@/api/needs';
import { useFollowedOrganizationIds } from '@/api/organizations';
import { useProfile } from '@/api/profile';
import { NeedCard } from '@/components/need-card';
import { NeedsMap } from '@/components/needs-map';
import { ThemedText } from '@/components/themed-text';
import { TravelRadiusSlider } from '@/components/travel-radius-slider';
import { Button } from '@/components/ui/button';
import { ChipGroup } from '@/components/ui/chip';
import { EmptyState, ErrorText, Loading } from '@/components/ui/message';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { SAN_FRANCISCO, useUserLocation } from '@/hooks/use-user-location';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage, lower } from '@/lib/format';
import { CATEGORIES, type NeedCategory } from '@/lib/labels';
import { MAX_TRAVEL_MILES, milesToMeters, TRAVEL_RADIUS_MARKS, useTravelRadius } from '@/lib/travel-radius';
import { NEED_SORTS, sortNeeds, type NeedSort } from '@/lib/urgency';

const FOLLOWED_PREVIEW = 3;

const CATEGORY_FILTERS = [{ value: 'all' as const, label: 'anything' }, ...CATEGORIES];

export default function GiveScreen() {
  const theme = useTheme();
  const profile = useProfile();
  const userLocation = useUserLocation();
  const [showSanFrancisco, setShowSanFrancisco] = useState(false);
  const [category, setCategory] = useState<NeedCategory | 'all'>('all');
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [sort, setSort] = useState<NeedSort>('nearest');

  const center =
    showSanFrancisco || userLocation.status === 'unavailable' ? SAN_FRANCISCO : userLocation.location;
  const [radiusMiles, setRadiusMiles] = useTravelRadius();
  const [choosingRadius, setChoosingRadius] = useState(false);
  const radiusMeters = milesToMeters(radiusMiles);
  // The next labelled distance out, for the empty state.
  const widerRadius = radiusMiles < MAX_TRAVEL_MILES ? TRAVEL_RADIUS_MARKS.find((miles) => miles > radiusMiles) : undefined;
  const needs = useNearbyNeeds(center, category === 'all' ? null : category, radiusMeters);
  const followedIds = useFollowedOrganizationIds();
  const followedNeeds = useFollowedNeeds(followedIds.data, category === 'all' ? null : category);
  const [showAllFollowed, setShowAllFollowed] = useState(false);
  const following = (followedIds.data?.size ?? 0) > 0;
  const followedList = (followedNeeds.data ?? []).map((need) => ({
    ...need,
    distance_m: needs.data?.find((nearby) => nearby.need_id === need.need_id)?.distance_m ?? null,
  }));
  const shownFollowed = showAllFollowed ? followedList : followedList.slice(0, FOLLOWED_PREVIEW);

  const organizationNeeds = (needs.data ?? []).filter(
    (need) => !selectedOrganizationId || need.organization_id === selectedOrganizationId,
  );
  const selectedOrganizationName = lower(organizationNeeds[0]?.organization_name);
  // Needs from places you follow live in their own section above, so they
  // aren't repeated below, except when a place is picked on the map: then
  // all of its needs show.
  const shownAbove = new Set(selectedOrganizationId ? [] : followedList.map((need) => need.need_id));
  const visibleNeeds = sortNeeds(
    organizationNeeds.filter((need) => !shownAbove.has(need.need_id)),
    sort,
  );
  const allShownAbove = visibleNeeds.length === 0 && organizationNeeds.length > 0;

  let where = 'finding your location…';
  if (showSanFrancisco) where = 'san francisco';
  else if (userLocation.status === 'found') where = 'near you';
  else if (userLocation.status === 'unavailable') where = 'san francisco (location is off)';

  const firstName = lower(profile.data?.display_name.split(' ')[0]);

  return (
    <Screen
      onRefresh={() => Promise.all([needs.refetch(), followedIds.refetch(), followedNeeds.refetch()])}
      // No header here: the screen handles the top safe area itself.
      headerless>
      <View style={styles.header}>
        <View style={styles.where}>
          <SymbolView
            name={{ ios: 'location.fill', android: 'location_on', web: 'location_on' }}
            size={14}
            tintColor={theme.textSecondary}
          />
          <ThemedText type="small" themeColor="textSecondary" style={styles.flexShrink}>
            {firstName ? `hi ${firstName} · ${where}` : where} ·{' '}
            <ThemedText
              type="smallBold"
              themeColor="tint"
              accessibilityRole="button"
              accessibilityLabel={`within ${radiusMiles} miles. change how far you'll travel`}
              onPress={() => setChoosingRadius((open) => !open)}>
              within {radiusMiles} mi {choosingRadius ? '▴' : '▾'}
            </ThemedText>
          </ThemedText>
        </View>
        {choosingRadius ? (
          <TravelRadiusSlider
            value={radiusMiles}
            onChange={(miles) => {
              setRadiusMiles(miles);
              setSelectedOrganizationId(null);
            }}
          />
        ) : null}
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
          radiusMeters={radiusMeters}
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
          <ThemedText type="sectionTitle">{followedList.length > 0 ? 'more needs near you' : 'needs near you'}</ThemedText>
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
      ) : allShownAbove ? (
        <ThemedText type="small" themeColor="textSecondary">
          everything open nearby is from places you follow, shown above.
        </ThemedText>
      ) : visibleNeeds.length === 0 ? (
        <>
          <EmptyState
            title="nothing open nearby right now"
            body={`no needs within ${radiusMiles} mi${category === 'all' ? '' : ' in this category'}. check back soon${widerRadius ? ', or look further out' : ''}.`}
          />
          {widerRadius ? (
            <Button
              variant="secondary"
              label={`look within ${widerRadius} mi`}
              onPress={() => setRadiusMiles(widerRadius)}
            />
          ) : null}
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
  flexShrink: { flexShrink: 1 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: Spacing.one,
  },
});
