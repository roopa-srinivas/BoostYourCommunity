import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Circle } from 'react-native-maps';

import type { CircleMapProps } from '@/components/circle-map-types';
import { MapButton } from '@/components/map-button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { heatCircle, HOME_DELTA } from '@/lib/heat';

/** The giving map on phones: Apple or Google maps via react-native-maps. */
export function CircleMap({
  center,
  spots,
  style,
  controlsTop,
  onPressMap,
}: CircleMapProps) {
  const theme = useTheme();
  const mapRef = useRef<MapView>(null);
  const most = Math.max(1, ...spots.map((s) => Number(s.items_received)));
  const home = { ...center, latitudeDelta: HOME_DELTA, longitudeDelta: HOME_DELTA };

  return (
    <View style={style}>
      <MapView
        ref={mapRef}
        key={`${center.latitude},${center.longitude}`}
        style={styles.fill}
        initialRegion={home}
        showsUserLocation
        onPress={onPressMap}>
        {spots.map((spot) => {
          const circle = heatCircle(spot, most, theme.accent);
          return (
            <Circle
              key={spot.organization_id}
              center={{ latitude: spot.org_lat, longitude: spot.org_lng }}
              radius={circle.radius}
              fillColor={circle.fill}
              strokeColor={circle.stroke}
              strokeWidth={1.5}
            />
          );
        })}
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
});
