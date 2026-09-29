import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useEffect, useRef, useState } from 'react';

import { Colors } from '@/constants/theme';

// Free OpenStreetMap tiles. Their usage policy asks for this credit and
// light use; a pilot is fine, heavy traffic would need a paid tile service.
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * A Leaflet map in a div that fills its parent. Returns the map once it
 * exists. Scroll-wheel zoom only when `interactive`, so a small map on a
 * scrolling page doesn't swallow the scroll.
 */
export function useLeafletMap(interactive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<L.Map | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    // No +/- buttons: they'd sit under the app's own map buttons. Pinch,
    // double-click and (full screen) the scroll wheel still zoom.
    const created = L.map(container, { scrollWheelZoom: interactive, zoomControl: false });
    L.tileLayer(TILES, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(created);
    created.attributionControl.setPrefix(false);
    // Opening full screen or rotating resizes the box; Leaflet needs to know.
    const resize = new ResizeObserver(() => created.invalidateSize());
    resize.observe(container);
    setMap(created);
    return () => {
      resize.disconnect();
      created.remove();
      setMap(null);
    };
  }, [interactive]);

  return { containerRef, map };
}

export function LeafletContainer({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  // `isolation` keeps Leaflet's layered panes inside this box, under the app's buttons.
  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', isolation: 'isolate', background: Colors.light.backgroundSelected }}
    />
  );
}

/** Text as a DOM node, so names from the database are never read as HTML. */
export function textNode(text: string) {
  const span = document.createElement('span');
  span.textContent = text;
  return span;
}
