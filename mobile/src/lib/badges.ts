import type { SymbolViewProps } from 'expo-symbols';

/** Milestones from the original prototype, counted in confirmed items given. */
const BASE_BADGES: readonly { milestone: number; title: string; icon: SymbolViewProps['name'] }[] = [
  { milestone: 1, title: 'kindling kindness', icon: { ios: 'flame.fill', android: 'local_fire_department', web: 'local_fire_department' } },
  { milestone: 5, title: 'neighborhood nurturer', icon: { ios: 'house.fill', android: 'home', web: 'home' } },
  { milestone: 10, title: 'local hero', icon: { ios: 'star.fill', android: 'star', web: 'star' } },
  { milestone: 25, title: 'community champion', icon: { ios: 'trophy.fill', android: 'emoji_events', web: 'emoji_events' } },
  { milestone: 50, title: 'guardian of goodness', icon: { ios: 'shield.fill', android: 'shield', web: 'shield' } },
  { milestone: 100, title: 'humanity’s beacon', icon: { ios: 'sun.max.fill', android: 'wb_sunny', web: 'wb_sunny' } },
];

const LEGEND_ICON: SymbolViewProps['name'] = {
  ios: 'crown.fill',
  android: 'workspace_premium',
  web: 'workspace_premium',
};

export type Badge = {
  milestone: number;
  title: string;
  icon: SymbolViewProps['name'];
  /** When it was earned, or null if not yet. */
  earnedAt: Date | null;
};

/** After 100, a "legend of the locals" badge every 100 items: 200, 300, 400… */
function badgeFor(milestone: number) {
  return (
    BASE_BADGES.find((b) => b.milestone === milestone) ?? {
      milestone,
      title: `legend of the locals (${milestone})`,
      icon: LEGEND_ICON,
    }
  );
}

type Confirmed = { quantity: number; resolvedAt: Date };

/**
 * Badges from confirmed donations: every badge earned so far (with the date
 * the running total crossed its milestone), then the next one to aim for.
 */
export function computeBadges(confirmed: Confirmed[]) {
  const sorted = [...confirmed].sort((a, b) => a.resolvedAt.getTime() - b.resolvedAt.getTime());
  const total = sorted.reduce((sum, c) => sum + c.quantity, 0);

  const milestones = BASE_BADGES.map((b) => b.milestone);
  // Include the next legend badge above the current total so there's always one to aim for.
  for (let m = 200; m <= Math.max(200, total + 100); m += 100) milestones.push(m);

  let running = 0;
  let index = 0;
  const earnedAt = new Map<number, Date>();
  for (const milestone of milestones) {
    while (running < milestone && index < sorted.length) {
      running += sorted[index].quantity;
      if (running >= milestone) earnedAt.set(milestone, sorted[index].resolvedAt);
      index++;
    }
    if (running >= milestone && !earnedAt.has(milestone)) earnedAt.set(milestone, sorted[index - 1].resolvedAt);
  }

  const badges: Badge[] = milestones.map((m) => ({ ...badgeFor(m), earnedAt: earnedAt.get(m) ?? null }));
  const next = badges.find((b) => !b.earnedAt) ?? null;
  return { total, earned: badges.filter((b) => b.earnedAt), next };
}
