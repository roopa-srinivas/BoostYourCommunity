import { router } from 'expo-router';
import { useState } from 'react';

import { NEARBY_RADIUS_METERS, useNearbyNeeds } from '@/api/needs';
import { NeedCard } from '@/components/need-card';
import { NeedsMap } from '@/components/needs-map';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ChipGroup } from '@/components/ui/chip';
import { EmptyState, ErrorText, Loading } from '@/components/ui/message';
import { Screen } from '@/components/ui/screen';
import { SAN_FRANCISCO, useUserLocation } from '@/hooks/use-user-location';
import { errorMessage, formatDistance } from '@/lib/format';
import { CATEGORIES, type NeedCategory } from '@/lib/labels';

const CATEGORY_FILTERS = [{ value: 'all' as const, label: 'All' }, ...CATEGORIES];

export default function GiveScreen() {
  const userLocation = useUserLocation();
  const [showSanFrancisco, setShowSanFrancisco] = useState(false);
  const [category, setCategory] = useState<NeedCategory | 'all'>('all');
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);

  const center =
    showSanFrancisco || userLocation.status === 'unavailable' ? SAN_FRANCISCO : userLocation.location;
  const needs = useNearbyNeeds(center, category === 'all' ? null : category);

  const visibleNeeds = (needs.data ?? []).filter(
    (need) => !selectedOrganizationId || need.organization_id === selectedOrganizationId,
  );
  const selectedOrganizationName = visibleNeeds[0]?.organization_name;

  let locationNote = 'Finding your location…';
  if (showSanFrancisco) locationNote = 'Showing needs in San Francisco.';
  else if (userLocation.status === 'found') locationNote = 'Showing needs near you.';
  else if (userLocation.status === 'unavailable')
    locationNote = 'Location is off, so we’re showing San Francisco. Turn on location to see needs near you.';

  return (
    <Screen refreshing={needs.isRefetching} onRefresh={needs.refetch}>
      <ThemedText type="small" themeColor="textSecondary">
        {locationNote}
      </ThemedText>

      <ChipGroup
        scroll
        options={CATEGORY_FILTERS}
        value={category}
        onChange={(next) => {
          setCategory(next);
          setSelectedOrganizationId(null);
        }}
      />

      {center ? (
        <NeedsMap
          center={center}
          needs={needs.data ?? []}
          selectedOrganizationId={selectedOrganizationId}
          onSelectOrganization={setSelectedOrganizationId}
        />
      ) : null}

      {selectedOrganizationId && selectedOrganizationName ? (
        <Button
          variant="secondary"
          label={`Showing ${selectedOrganizationName} · Show all`}
          onPress={() => setSelectedOrganizationId(null)}
        />
      ) : null}

      {needs.error ? <ErrorText>{errorMessage(needs.error)}</ErrorText> : null}

      {!center || needs.isPending ? (
        <Loading />
      ) : visibleNeeds.length === 0 ? (
        <>
          <EmptyState
            title="No open needs nearby right now"
            body={`Nothing within ${formatDistance(NEARBY_RADIUS_METERS)}${category === 'all' ? '' : ' in this category'}. Check back soon.`}
          />
          {!showSanFrancisco && userLocation.status === 'found' ? (
            <Button
              variant="secondary"
              label="See San Francisco instead"
              onPress={() => setShowSanFrancisco(true)}
            />
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
