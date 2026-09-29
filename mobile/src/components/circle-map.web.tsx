import L from 'leaflet';
import { useEffect, useEffectEvent, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { CircleMapProps } from '@/components/circle-map-types';
import { LeafletContainer, textNode, useLeafletMap } from '@/components/leaflet-map.web';
import { MapButton } from '@/components/map-button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { heatCircle, HOME_DELTA } from '@/lib/heat';

/** The giving map on the web: Leaflet with OpenStreetMap tiles. */
export function CircleMap({ center, spots, style, interactive, controlsTop, onPressMap }: CircleMapProps) {
  const theme = useTheme();
  const { containerRef, map } = useLeafletMap(interactive);
  const pressMap = useEffectEvent(() => onPressMap?.());
  const home = useMemo(
    () =>
      L.latLngBounds(
        [center.latitude - HOME_DELTA / 2, center.longitude - HOME_DELTA / 2],
        [center.latitude + HOME_DELTA / 2, center.longitude + HOME_DELTA / 2],
      ),
    [center.latitude, center.longitude],
  );

  useEffect(() => {
    map?.fitBounds(home);
  }, [map, home]);

  useEffect(() => {
    if (!map) return;
    const onClick = () => pressMap();
    map.on('click', onClick);
    return () => {
      map.off('click', onClick);
    };
  }, [map]);

  useEffect(() => {
    if (!map) return;
    const layer = L.layerGroup().addTo(map);
    const most = Math.max(1, ...spots.map((s) => Number(s.items_received)));
    for (const spot of spots) {
      const circle = heatCircle(spot, most, theme.accent);
      L.circle([spot.org_lat, spot.org_lng], {
        radius: circle.radius,
        color: circle.stroke,
        fillColor: circle.fill,
        // The colors carry their own transparency.
        opacity: 1,
        fillOpacity: 1,
        weight: 1.5,
      })
        .bindTooltip(textNode(`${spot.organization_name.toLowerCase()} · ${spot.items_received} received`))
        .addTo(layer);
    }
    return () => {
      layer.remove();
    };
  }, [map, spots, theme.accent]);

  return (
    <View style={style}>
      <LeafletContainer containerRef={containerRef} />
      <MapButton
        icon="recenter"
        label="recenter the map"
        onPress={() => map?.flyToBounds(home, { duration: 0.4 })}
        style={[styles.recenter, { top: controlsTop }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  recenter: { right: Spacing.two },
});
