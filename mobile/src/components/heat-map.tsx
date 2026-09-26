import { useRef, useState } from 'react';
import { Modal, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import MapView, { Circle } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { HeatSpot } from '@/api/community';
import type { Coordinates } from '@/api/needs';
import { MapButton } from '@/components/map-button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const MIN_RADIUS_M = 180;
const MAX_RADIUS_M = 650;
const HOME_DELTA = 0.14;

/** Hex color plus alpha, e.g. withAlpha('#B4502B', 0.4). */
function withAlpha(hex: string, alpha: number) {
  return `${hex}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
}

type HeatMapProps = { center: Coordinates; spots: HeatSpot[] };

/**
 * Terracotta circles over each organization, bigger and stronger where more
 * was given. Tapping the map (or the expand button) opens it full screen.
 */
export function HeatMap(props: HeatMapProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(false);

  return (
    <View>
      <CircleMap {...props} style={styles.small} controlsTop={Spacing.two + 44} onPressMap={() => setExpanded(true)} />
      <MapButton icon="expand" label="expand the map" onPress={() => setExpanded(true)} style={styles.expand} />
      <Modal
        visible={expanded}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setExpanded(false)}>
        <View style={[styles.fill, { backgroundColor: theme.background }]}>
          <CircleMap {...props} style={styles.fill} controlsTop={insets.top + Spacing.two} />
          <MapButton
            icon="close"
            label="close the map"
            size={44}
            onPress={() => setExpanded(false)}
            style={[styles.close, { top: insets.top + Spacing.two }]}
          />
          <View
            style={[styles.hint, { bottom: insets.bottom + Spacing.four, backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="small">bigger, darker circles: more given there lately</ThemedText>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function CircleMap({
  center,
  spots,
  style,
  controlsTop,
  onPressMap,
}: HeatMapProps & {
  style: StyleProp<ViewStyle>;
  /** Where the recenter button sits from the top, clear of other controls. */
  controlsTop: number;
  onPressMap?: () => void;
}) {
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
  small: { height: 220, borderRadius: Radius.card, overflow: 'hidden' },
  fill: { flex: 1 },
  expand: { top: Spacing.two, right: Spacing.two },
  recenter: { right: Spacing.two },
  close: { left: Spacing.three },
  hint: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
});
