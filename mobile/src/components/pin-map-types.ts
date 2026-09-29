import type { StyleProp, ViewStyle } from 'react-native';

import type { Coordinates, NearbyNeed } from '@/api/needs';

export type NeedsMapProps = {
  center: Coordinates;
  /** How far the donor will travel; drawn as a circle and used for the zoom. */
  radiusMeters: number;
  needs: NearbyNeed[];
  selectedOrganizationId: string | null;
  onSelectOrganization: (organizationId: string | null) => void;
};

/** One map surface with pins, used by NeedsMap on phones (native) and web (Leaflet). */
export type PinMapProps = NeedsMapProps & {
  onPressMap: () => void;
  style: StyleProp<ViewStyle>;
  /** Full screen: scroll-wheel zoom on the web. The small map leaves the page scrolling. */
  interactive: boolean;
  /** Where the recenter button sits from the top, clear of other controls. */
  controlsTop: number;
};
