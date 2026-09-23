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

/** "today", "tomorrow", or e.g. "thu, sep 24". */
export function formatDay(date: Date, now = new Date()) {
  const days = Math.round((startOfDay(date).getTime() - startOfDay(now).getTime()) / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toLowerCase();
}

/** "6 pm" or "6:30 pm". */
export function formatTime(date: Date) {
  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: date.getMinutes() === 0 ? undefined : '2-digit',
  });
  return time.toLowerCase();
}

/** "today 4 pm – 7 pm" or "today 4 pm – thu, sep 24 7 pm". */
export function formatWindow(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const sameDay = startOfDay(start).getTime() === startOfDay(end).getTime();
  const startText = `${formatDay(start)} ${formatTime(start)}`;
  return sameDay
    ? `${startText} – ${formatTime(end)}`
    : `${startText} – ${formatDay(end)} ${formatTime(end)}`;
}

/** Turns a Supabase/Postgres error into something we can show people. */
export function errorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message.toLowerCase();
  }
  return 'something went wrong. please try again.';
}
