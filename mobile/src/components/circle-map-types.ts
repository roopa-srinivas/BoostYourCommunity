import type { StyleProp, ViewStyle } from 'react-native';

import type { HeatSpot } from '@/api/community';
import type { Coordinates } from '@/api/needs';

export type HeatMapProps = { center: Coordinates; spots: HeatSpot[] };

/** One map surface with giving circles, used by HeatMap on phones (native) and web (Leaflet). */
export type CircleMapProps = HeatMapProps & {
  style: StyleProp<ViewStyle>;
  /** Full screen: scroll-wheel zoom on the web. The small map leaves the page scrolling. */
  interactive: boolean;
  /** Where the recenter button sits from the top, clear of other controls. */
  controlsTop: number;
  onPressMap?: () => void;
};
