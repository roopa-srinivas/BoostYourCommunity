import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import type { Coordinates, NearbyNeed } from '@/api/needs';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type NeedsMapProps = {
  center: Coordinates;
  needs: NearbyNeed[];
  selectedOrganizationId: string | null;
  onSelectOrganization: (organizationId: string | null) => void;
};

/** One pin per organization; tapping a pin filters the list to its needs. */
export function NeedsMap({ center, needs, selectedOrganizationId, onSelectOrganization }: NeedsMapProps) {
  const theme = useTheme();

  const organizations = useMemo(() => {
    const byId = new Map<string, { id: string; name: string; latitude: number; longitude: number; count: number }>();
    for (const need of needs) {
      const existing = byId.get(need.organization_id);
      if (existing) existing.count += 1;
      else
        byId.set(need.organization_id, {
          id: need.organization_id,
          name: need.organization_name,
          latitude: need.org_lat,
          longitude: need.org_lng,
          count: 1,
        });
    }
    return [...byId.values()];
  }, [needs]);

  return (
    <MapView
      // Re-center when the search location changes (e.g. switching to San Francisco).
      key={`${center.latitude},${center.longitude}`}
      style={styles.map}
      initialRegion={{ ...center, latitudeDelta: 0.12, longitudeDelta: 0.12 }}
      showsUserLocation
      onPress={(event) => {
        // Android reports marker taps as map presses too.
        if (event.nativeEvent.action !== 'marker-press') onSelectOrganization(null);
      }}>
      {organizations.map((organization) => (
        <Marker
          key={organization.id}
          coordinate={{ latitude: organization.latitude, longitude: organization.longitude }}
          title={organization.name}
          description={`${organization.count} open ${organization.count === 1 ? 'need' : 'needs'}`}
          pinColor={organization.id === selectedOrganizationId ? theme.tint : undefined}
          onPress={() => onSelectOrganization(organization.id)}
        />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { height: 280, borderRadius: Spacing.three, overflow: 'hidden' },
});
