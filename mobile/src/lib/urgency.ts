const HOUR_MS = 60 * 60 * 1000;
/** Needs that close within this window are flagged to donors. */
export const CLOSING_SOON_MS = 24 * HOUR_MS;

export function isClosingSoon(endsAt: string, now = Date.now()) {
  const remaining = new Date(endsAt).getTime() - now;
  return remaining > 0 && remaining <= CLOSING_SOON_MS;
}

/** "closes in 45 min" / "closes in 5 hours". Only meaningful for needs closing soon. */
export function formatClosesIn(endsAt: string, now = Date.now()) {
  const minutes = Math.max(1, Math.round((new Date(endsAt).getTime() - now) / 60_000));
  if (minutes < 60) return `closes in ${minutes} min`;
  const hours = Math.round(minutes / 60);
  return `closes in ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
}

export type NeedSort = 'nearest' | 'closing' | 'most-needed';

export const NEED_SORTS: readonly { value: NeedSort; label: string }[] = [
  { value: 'nearest', label: 'nearest' },
  { value: 'closing', label: 'closing soon' },
  { value: 'most-needed', label: 'most needed' },
];

type Sortable = {
  distance_m: number;
  dropoff_ends_at: string;
  quantity_needed: number;
  quantity_remaining: number;
};

/** Returns a sorted copy. "most needed" = least pledged so far, then most items left. */
export function sortNeeds<T extends Sortable>(needs: readonly T[], sort: NeedSort): T[] {
  const copy = [...needs];
  if (sort === 'closing') {
    copy.sort((a, b) => new Date(a.dropoff_ends_at).getTime() - new Date(b.dropoff_ends_at).getTime());
  } else if (sort === 'most-needed') {
    copy.sort(
      (a, b) =>
        b.quantity_remaining / b.quantity_needed - a.quantity_remaining / a.quantity_needed ||
        b.quantity_remaining - a.quantity_remaining,
    );
  } else {
    copy.sort((a, b) => a.distance_m - b.distance_m);
  }
  return copy;
}
