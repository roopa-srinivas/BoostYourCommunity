import type { HeatSpot } from '@/api/community';
import type { Coordinates } from '@/api/needs';

/** react-native-maps doesn't support web, so the web app shows the list only. */
export function HeatMap(_props: { center: Coordinates; spots: HeatSpot[] }) {
  return null;
}
