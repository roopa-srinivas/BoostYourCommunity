const METERS_PER_MILE = 1609.344;

/**
 * "1 bottle", "3 bottles". Units are typed by organizations in the plural, so
 * for one item we drop a trailing "s"/"es" ("pairs" -> "pair",
 * "toothbrushes" -> "toothbrush").
 */
export function formatQuantity(quantity: number, unit: string) {
  if (quantity !== 1) return `${quantity} ${unit}`;
  let singular = unit;
  if (/(sh|ch|x|ss)es$/i.test(unit)) singular = unit.slice(0, -2);
  else if (/[^s]s$/i.test(unit)) singular = unit.slice(0, -1);
  return `${quantity} ${singular}`;
}

export function formatDistance(meters: number) {
  const miles = meters / METERS_PER_MILE;
  return miles < 0.1 ? 'nearby' : `${miles.toFixed(1)} mi`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** "Today", "Tomorrow", or e.g. "Thu, Sep 24". */
export function formatDay(date: Date, now = new Date()) {
  const days = Math.round((startOfDay(date).getTime() - startOfDay(now).getTime()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatTime(date: Date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/** "Today 4:00 PM – 7:00 PM" or "Today 4:00 PM – Thu, Sep 24 7:00 PM". */
export function formatWindow(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const sameDay = startOfDay(start).getTime() === startOfDay(end).getTime();
  const startText = `${formatDay(start)} ${formatTime(start)}`;
  return sameDay
    ? `${startText} – ${formatTime(end)}`
    : `${startText} – ${formatDay(end)} ${formatTime(end)}`;
}

/** Turns a Supabase/Postgres error into a sentence we can show people. */
export function errorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    const message = error.message;
    return message.charAt(0).toUpperCase() + message.slice(1);
  }
  return 'Something went wrong. Please try again.';
}
