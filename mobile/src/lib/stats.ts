import type { NeedCategory } from './labels';

/** Share of resolved pledges that were dropped off, or null when none were resolved. */
export function arrivalRate(stats: { arrived: number; no_shows: number }) {
  const resolved = stats.arrived + stats.no_shows;
  return resolved === 0 ? null : stats.arrived / resolved;
}

export type ConfirmedGift = {
  quantity: number;
  resolvedAt: Date;
  category: NeedCategory | null;
  organizationId: string | null;
};

export type YearInGiving = {
  year: number;
  items: number;
  dropoffs: number;
  places: number;
  /** The category with the most items, when there's a clear one. */
  topCategory: NeedCategory | null;
  /** "october", when giving happened in more than one month. */
  busiestMonth: string | null;
};

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

/** Years with at least one confirmed drop-off, newest first. */
export function givingYears(gifts: ConfirmedGift[]) {
  return [...new Set(gifts.map((g) => g.resolvedAt.getFullYear()))].sort((a, b) => b - a);
}

/** A year of confirmed drop-offs, summed up. */
export function yearInGiving(gifts: ConfirmedGift[], year: number): YearInGiving {
  const inYear = gifts.filter((g) => g.resolvedAt.getFullYear() === year);

  const byCategory = new Map<NeedCategory, number>();
  const byMonth = new Map<number, number>();
  for (const g of inYear) {
    if (g.category) byCategory.set(g.category, (byCategory.get(g.category) ?? 0) + g.quantity);
    const month = g.resolvedAt.getMonth();
    byMonth.set(month, (byMonth.get(month) ?? 0) + g.quantity);
  }

  const categories = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
  const topCategory = categories.length > 0 && categories[0][1] !== categories[1]?.[1] ? categories[0][0] : null;
  const months = [...byMonth.entries()].sort((a, b) => b[1] - a[1]);
  const busiestMonth = months.length > 1 && months[0][1] !== months[1][1] ? MONTHS[months[0][0]] : null;

  return {
    year,
    items: inYear.reduce((sum, g) => sum + g.quantity, 0),
    dropoffs: inYear.length,
    places: new Set(inYear.map((g) => g.organizationId).filter(Boolean)).size,
    topCategory,
    busiestMonth,
  };
}
