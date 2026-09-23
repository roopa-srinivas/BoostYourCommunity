import type { Enums } from './database.types';

export type RepeatFrequency = Enums<'repeat_frequency'>;

export const REPEAT_OPTIONS: readonly { value: RepeatFrequency | 'none'; label: string }[] = [
  { value: 'none', label: 'doesn’t repeat' },
  { value: 'daily', label: 'every day' },
  { value: 'weekly', label: 'every week' },
  { value: 'biweekly', label: 'every 2 weeks' },
  { value: 'monthly', label: 'every month' },
];

/** Short label for badges: "daily", "weekly", "every 2 weeks", "monthly". */
export function repeatBadge(frequency: RepeatFrequency) {
  return { daily: 'daily', weekly: 'weekly', biweekly: 'every 2 weeks', monthly: 'monthly' }[frequency];
}

const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th'];

/**
 * A plain-words description anchored on the first drop-off:
 * "every day", "every week on tuesdays", "every month on the 2nd tuesday".
 */
export function describeRepeat(frequency: RepeatFrequency, start: Date) {
  const weekday = start.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  switch (frequency) {
    case 'daily':
      return 'every day';
    case 'weekly':
      return `every week on ${weekday}s`;
    case 'biweekly':
      return `every 2 weeks on ${weekday}s`;
    case 'monthly': {
      const nth = Math.ceil(start.getDate() / 7);
      // Matches the database: a 5th weekday becomes the month's last one.
      return nth >= 5 ? `every month on the last ${weekday}` : `every month on the ${ORDINALS[nth - 1]} ${weekday}`;
    }
  }
}
