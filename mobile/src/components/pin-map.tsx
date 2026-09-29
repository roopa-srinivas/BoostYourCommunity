import { useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';

import { MapButton } from '@/components/map-button';
import type { PinMapProps } from '@/components/pin-map-types';
import { ThemedText } from '@/components/themed-text';
import { FontFamily, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { organizationPins } from '@/lib/map-pins';

const METERS_PER_DEGREE_LATITUDE = 111_000;

/** The Give map on phones: Apple or Google maps via react-native-maps. */
export function PinMap({
  center,
  radiusMeters,
  needs,
  selectedOrganizationId,
  onSelectOrganization,
  onPressMap,
  style,
  controlsTop,
}: PinMapProps) {
  const theme = useTheme();
  const mapRef = useRef<MapView>(null);

  const organizations = useMemo(() => organizationPins(needs), [needs]);

  // Show the whole travel circle with a little room around it.
  const delta = ((radiusMeters * 2) / METERS_PER_DEGREE_LATITUDE) * 1.15;
  const home = { ...center, latitudeDelta: delta, longitudeDelta: delta };

  return (
    <View style={style}>
      <MapView
        ref={mapRef}
        // Re-center when the search location or distance changes (e.g. switching to San Francisco).
        key={`${center.latitude},${center.longitude},${radiusMeters}`}
        style={styles.fill}
        initialRegion={home}
        showsUserLocation
        onPress={(event) => {
          // Android reports marker taps as map presses too.
          if (event.nativeEvent.action !== 'marker-press') onPressMap();
        }}>
        <Circle
          center={center}
          radius={radiusMeters}
          strokeWidth={2}
          strokeColor={theme.tint}
          fillColor={`${theme.tint}14`}
        />
        {organizations.map((organization) => (
          <Marker
            key={organization.id}
            coordinate={{ latitude: organization.latitude, longitude: organization.longitude }}
            title={organization.name}
            description={`${organization.count} open ${organization.count === 1 ? 'need' : 'needs'}`}
            onPress={() => onSelectOrganization(organization.id)}>
            {/* Terracotta pin with the number of open needs; green when selected. */}
            <View
              style={[
                styles.pin,
                {
                  backgroundColor: organization.id === selectedOrganizationId ? theme.tint : theme.accent,
                  borderColor: theme.backgroundElement,
                },
              ]}>
              <ThemedText style={[styles.pinLabel, { color: theme.onAccent }]}>{organization.count}</ThemedText>
            </View>
          </Marker>
        ))}
      </MapView>
      <MapButton
        icon="recenter"
        label="recenter the map"
        onPress={() => mapRef.current?.animateToRegion(home, 400)}
        style={[styles.recenter, { top: controlsTop }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  recenter: { right: Spacing.two },
  pin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinLabel: { fontFamily: FontFamily.bold, fontSize: 14, lineHeight: 18 },
});
