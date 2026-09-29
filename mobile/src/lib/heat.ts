import type { HeatSpot } from '@/api/community';

const MIN_RADIUS_M = 180;
const MAX_RADIUS_M = 650;
/** How much of the map the giving map shows at first, in degrees. */
export const HOME_DELTA = 0.14;

/** Hex color plus alpha, e.g. withAlpha('#B4502B', 0.4). */
export function withAlpha(hex: string, alpha: number) {
  return `${hex}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
}

/** Bigger and stronger where more was given, relative to the most-given spot. */
export function heatCircle(spot: HeatSpot, most: number, color: string) {
  const share = Number(spot.items_received) / most;
  return {
    radius: MIN_RADIUS_M + share * (MAX_RADIUS_M - MIN_RADIUS_M),
    fill: withAlpha(color, share > 0 ? 0.2 + share * 0.45 : 0.08),
    stroke: withAlpha(color, share > 0 ? 0.9 : 0.3),
  };
}
