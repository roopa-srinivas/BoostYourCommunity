import type { Enums, Tables } from './database.types';
import { formatDay } from './format';

export type RepeatUnit = Enums<'repeat_unit'>;
export type MonthMode = Enums<'repeat_month_mode'>;

/** A repeat rule, like a calendar's "custom" repeat. */
export type RepeatRule = {
  unit: RepeatUnit;
  /** Every how many days / weeks / months. */
  interval: number;
  /** Weekly only: 0 = Sunday … 6 = Saturday. Empty means the start's weekday. */
  weekdays: number[];
  /** Monthly only: same date ("the 15th") or same weekday position ("the 2nd tuesday"). */
  monthMode: MonthMode;
  endsAfter: number | null;
  /** Last local date an occurrence may start on, "YYYY-MM-DD". */
  until: string | null;
};

export type RepeatPreset = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';

export const PRESET_OPTIONS: readonly { value: RepeatPreset; label: string }[] = [
  { value: 'none', label: 'doesn’t repeat' },
  { value: 'daily', label: 'every day' },
  { value: 'weekly', label: 'every week' },
  { value: 'biweekly', label: 'every 2 weeks' },
  { value: 'monthly', label: 'every month' },
  { value: 'custom', label: 'custom…' },
];

const basic = (unit: RepeatUnit, interval: number, monthMode: MonthMode = 'weekday'): RepeatRule => ({
  unit,
  interval,
  weekdays: [],
  monthMode,
  endsAfter: null,
  until: null,
});

/** The rule a preset stands for; null for "doesn't repeat" and "custom". */
export function presetRule(preset: RepeatPreset): RepeatRule | null {
  switch (preset) {
    case 'daily':
      return basic('day', 1);
    case 'weekly':
      return basic('week', 1);
    case 'biweekly':
      return basic('week', 2);
    case 'monthly':
      return basic('month', 1, 'weekday');
    default:
      return null;
  }
}

/** Which preset a rule is, or "custom" when it's anything more specific. */
export function matchPreset(rule: RepeatRule | null): RepeatPreset {
  if (!rule) return 'none';
  const simple = rule.weekdays.length === 0 && rule.endsAfter === null && rule.until === null;
  if (!simple) return 'custom';
  if (rule.unit === 'day' && rule.interval === 1) return 'daily';
  if (rule.unit === 'week' && rule.interval === 1) return 'weekly';
  if (rule.unit === 'week' && rule.interval === 2) return 'biweekly';
  if (rule.unit === 'month' && rule.interval === 1 && rule.monthMode === 'weekday') return 'monthly';
  return 'custom';
}

type RepeatColumns = Pick<
  Tables<'needs'>,
  'repeat_unit' | 'repeat_interval' | 'repeat_weekdays' | 'repeat_month_mode' | 'repeat_ends_after' | 'repeat_until'
>;

export function ruleFromNeed(need: RepeatColumns): RepeatRule | null {
  if (!need.repeat_unit) return null;
  return {
    unit: need.repeat_unit,
    interval: need.repeat_interval,
    weekdays: need.repeat_weekdays ?? [],
    monthMode: need.repeat_month_mode ?? 'weekday',
    endsAfter: need.repeat_ends_after,
    until: need.repeat_until,
  };
}

export function ruleToColumns(rule: RepeatRule | null): RepeatColumns {
  return {
    repeat_unit: rule?.unit ?? null,
    repeat_interval: rule?.interval ?? 1,
    repeat_weekdays: rule?.unit === 'week' && rule.weekdays.length > 0 ? [...rule.weekdays].sort() : null,
    repeat_month_mode: rule?.unit === 'month' ? rule.monthMode : null,
    repeat_ends_after: rule?.endsAfter ?? null,
    repeat_until: rule?.until ?? null,
  };
}

export const WEEKDAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function ordinal(n: number) {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${{ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th'}`;
}

function listNames(names: string[]) {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** "the 2nd tuesday" or "the last friday", matching the database's rule. */
export function weekdayPosition(start: Date) {
  const nth = Math.ceil(start.getDate() / 7);
  const weekday = WEEKDAY_NAMES[start.getDay()];
  return nth >= 5 ? `the last ${weekday}` : `the ${ordinal(nth)} ${weekday}`;
}

/** "the 15th", with a note when some months don't have that date. */
export function datePosition(start: Date) {
  const day = start.getDate();
  return day > 28 ? `the ${ordinal(day)} (or the month’s last day)` : `the ${ordinal(day)}`;
}

/** Local "YYYY-MM-DD" to a Date at local midnight. */
export function parseLocalDate(value: string) {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toLocalDateString(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Plain words, anchored on the first drop-off: "every day", "every 2 weeks
 * on monday and thursday", "every month on the 2nd tuesday, 6 times",
 * "every 3 days, until sat, dec 19".
 */
export function describeRepeat(rule: RepeatRule, start: Date) {
  const every = (singular: string, plural: string) =>
    rule.interval === 1 ? `every ${singular}` : `every ${rule.interval} ${plural}`;

  let text: string;
  if (rule.unit === 'day') {
    text = every('day', 'days');
  } else if (rule.unit === 'week') {
    const days = rule.weekdays.length > 0 ? [...rule.weekdays].sort() : [start.getDay()];
    text = `${every('week', 'weeks')} on ${listNames(days.map((d) => WEEKDAY_NAMES[d]))}`;
  } else {
    const position = rule.monthMode === 'date' ? datePosition(start) : weekdayPosition(start);
    text = `${every('month', 'months')} on ${position}`;
  }

  if (rule.endsAfter !== null) text += `, ${rule.endsAfter} ${rule.endsAfter === 1 ? 'time' : 'times'}`;
  else if (rule.until !== null) text += `, until ${formatDay(parseLocalDate(rule.until))}`;
  return text;
}

/** Short label for badges: "daily", "weekly", "every 2 weeks", "every 3 days"… */
export function repeatBadge(rule: RepeatRule) {
  const n = rule.interval;
  if (rule.unit === 'day') return n === 1 ? 'daily' : `every ${n} days`;
  if (rule.unit === 'week') return n === 1 ? 'weekly' : `every ${n} weeks`;
  return n === 1 ? 'monthly' : `every ${n} months`;
}
