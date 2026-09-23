import { StyleSheet } from 'react-native';
import MapView, { Circle } from 'react-native-maps';

import type { HeatSpot } from '@/api/community';
import type { Coordinates } from '@/api/needs';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const MIN_RADIUS_M = 180;
const MAX_RADIUS_M = 650;

/** Hex color plus alpha, e.g. withAlpha('#B4502B', 0.4). */
function withAlpha(hex: string, alpha: number) {
  return `${hex}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
}

/** Terracotta circles over each organization, bigger and stronger where more was given. */
export function HeatMap({ center, spots }: { center: Coordinates; spots: HeatSpot[] }) {
  const theme = useTheme();
  const most = Math.max(1, ...spots.map((s) => Number(s.items_received)));

  return (
    <MapView
      key={`${center.latitude},${center.longitude}`}
      style={styles.map}
      initialRegion={{ ...center, latitudeDelta: 0.14, longitudeDelta: 0.14 }}
      showsUserLocation>
      {spots.map((spot) => {
        const share = Number(spot.items_received) / most;
        return (
          <Circle
            key={spot.organization_id}
            center={{ latitude: spot.org_lat, longitude: spot.org_lng }}
            radius={MIN_RADIUS_M + share * (MAX_RADIUS_M - MIN_RADIUS_M)}
            fillColor={withAlpha(theme.accent, share > 0 ? 0.2 + share * 0.45 : 0.08)}
            strokeColor={withAlpha(theme.accent, share > 0 ? 0.9 : 0.3)}
            strokeWidth={1.5}
          />
        );
      })}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { height: 220, borderRadius: Radius.card, overflow: 'hidden' },
});
