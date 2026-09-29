import L from 'leaflet';
import { useEffect, useEffectEvent, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { LeafletContainer, textNode, useLeafletMap } from '@/components/leaflet-map.web';
import { MapButton } from '@/components/map-button';
import type { PinMapProps } from '@/components/pin-map-types';
import { FontFamily, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { organizationPins } from '@/lib/map-pins';

/** The Give map on the web: Leaflet with OpenStreetMap tiles. */
export function PinMap({
  center,
  radiusMeters,
  needs,
  selectedOrganizationId,
  onSelectOrganization,
  onPressMap,
  style,
  interactive,
  controlsTop,
}: PinMapProps) {
  const theme = useTheme();
  const { containerRef, map } = useLeafletMap(interactive);
  const organizations = useMemo(() => organizationPins(needs), [needs]);
  const pressMap = useEffectEvent(() => onPressMap());
  const selectOrganization = useEffectEvent((id: string) => onSelectOrganization(id));

  // The view that fits the travel circle ("home" for recenter).
  const home = useMemo(
    () => L.latLng(center.latitude, center.longitude).toBounds(radiusMeters * 2),
    [center.latitude, center.longitude, radiusMeters],
  );

  useEffect(() => {
    if (!map) return;
    const circle = L.circle([center.latitude, center.longitude], {
      radius: radiusMeters,
      color: theme.tint,
      weight: 2,
      fillColor: theme.tint,
      fillOpacity: 0.08,
    }).addTo(map);
    map.fitBounds(home, { padding: [8, 8] });
    return () => {
      circle.remove();
    };
  }, [map, home, center.latitude, center.longitude, radiusMeters, theme.tint]);

  useEffect(() => {
    if (!map) return;
    const onClick = () => pressMap();
    map.on('click', onClick);
    return () => {
      map.off('click', onClick);
    };
  }, [map]);

  // Terracotta pins with the number of open needs; green when selected.
  useEffect(() => {
    if (!map) return;
    const layer = L.layerGroup().addTo(map);
    for (const organization of organizations) {
      const selected = organization.id === selectedOrganizationId;
      const pin = document.createElement('div');
      pin.textContent = String(organization.count);
      Object.assign(pin.style, {
        width: '34px',
        height: '34px',
        boxSizing: 'border-box',
        borderRadius: '17px',
        border: `3px solid ${theme.backgroundElement}`,
        background: selected ? theme.tint : theme.accent,
        color: theme.onAccent,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        font: `14px ${FontFamily.bold}, sans-serif`,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
      });
      L.marker([organization.latitude, organization.longitude], {
        icon: L.divIcon({ html: pin, className: '', iconSize: [34, 34], iconAnchor: [17, 17] }),
        title: organization.name,
      })
        .bindTooltip(textNode(`${organization.name} · ${organization.count} open`), { direction: 'top', offset: [0, -16] })
        .on('click', () => selectOrganization(organization.id))
        .addTo(layer);
    }
    return () => {
      layer.remove();
    };
  }, [map, organizations, selectedOrganizationId, theme]);

  return (
    <View style={style}>
      <LeafletContainer containerRef={containerRef} />
      <MapButton
        icon="recenter"
        label="recenter the map"
        onPress={() => map?.flyToBounds(home, { padding: [8, 8], duration: 0.4 })}
        style={[styles.recenter, { top: controlsTop }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  recenter: { right: Spacing.two },
});
