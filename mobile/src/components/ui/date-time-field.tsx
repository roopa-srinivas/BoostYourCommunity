import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ChipGroup } from '@/components/ui/chip';
import { Spacing } from '@/constants/theme';
import { formatDay, formatTime } from '@/lib/format';

const DAYS_AHEAD = 14;
const FIRST_MINUTE = 6 * 60; // 6:00 AM
const LAST_MINUTE = 22 * 60; // 10:00 PM
const STEP_MINUTES = 30;

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function minutesOfDay(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

function withMinutes(day: Date, minutes: number) {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(minutes / 60), minutes % 60);
}

type DateTimeFieldProps = { label: string; value: Date; onChange: (value: Date) => void };

/** Day and time pickers built from chips, so they behave the same on every platform. */
export function DateTimeField({ label, value, onChange }: DateTimeFieldProps) {
  const today = new Date();
  const days: Date[] = [];
  for (let i = 0; i < DAYS_AHEAD; i++) {
    days.push(new Date(today.getFullYear(), today.getMonth(), today.getDate() + i));
  }
  // Keep an already-saved day selectable even if it's outside the usual range.
  if (!days.some((day) => dayKey(day) === dayKey(value))) {
    days.unshift(new Date(value.getFullYear(), value.getMonth(), value.getDate()));
  }

  const minutes: number[] = [];
  for (let m = FIRST_MINUTE; m <= LAST_MINUTE; m += STEP_MINUTES) minutes.push(m);
  if (!minutes.includes(minutesOfDay(value))) {
    minutes.push(minutesOfDay(value));
    minutes.sort((a, b) => a - b);
  }

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <ChipGroup
        scroll
        options={days.map((day) => ({ value: dayKey(day), label: formatDay(day) }))}
        value={dayKey(value)}
        onChange={(key) => {
          const day = days.find((d) => dayKey(d) === key)!;
          onChange(withMinutes(day, minutesOfDay(value)));
        }}
      />
      <ChipGroup
        scroll
        options={minutes.map((m) => ({ value: m, label: formatTime(withMinutes(value, m)) }))}
        value={minutesOfDay(value)}
        onChange={(m) => onChange(withMinutes(value, m))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.two },
});
