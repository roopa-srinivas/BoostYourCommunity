import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Calendar } from '@/components/ui/calendar';
import { ChipGroup } from '@/components/ui/chip';
import { Stepper } from '@/components/ui/stepper';
import { WeekdayPicker } from '@/components/ui/weekday-picker';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  datePosition,
  describeRepeat,
  parseLocalDate,
  toLocalDateString,
  weekdayPosition,
  WEEKDAY_NAMES,
  type RepeatRule,
} from '@/lib/repeat';

type Ends = 'never' | 'after' | 'on';

/** The "custom…" repeat editor: interval and unit, days, monthly style, and when it ends. */
export function RepeatEditor({
  rule,
  start,
  onChange,
}: {
  rule: RepeatRule;
  /** The first drop-off's start; weekday and date choices are relative to it. */
  start: Date;
  onChange: (rule: RepeatRule) => void;
}) {
  const theme = useTheme();
  const set = (patch: Partial<RepeatRule>) => onChange({ ...rule, ...patch });
  const plural = rule.interval !== 1;
  const ends: Ends = rule.endsAfter !== null ? 'after' : rule.until !== null ? 'on' : 'never';

  // A sensible default end date the first time "on a date" is picked: 3 months out.
  const defaultUntil = () => {
    const d = new Date(start);
    d.setMonth(d.getMonth() + 3);
    return toLocalDateString(d);
  };

  return (
    <View style={[styles.box, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={styles.field}>
        <ThemedText type="smallBold">every</ThemedText>
        <View style={styles.everyRow}>
          <Stepper value={rule.interval} min={1} max={99} onChange={(interval) => set({ interval })} />
        </View>
        <ChipGroup
          options={[
            { value: 'day', label: plural ? 'days' : 'day' },
            { value: 'week', label: plural ? 'weeks' : 'week' },
            { value: 'month', label: plural ? 'months' : 'month' },
          ]}
          value={rule.unit}
          onChange={(unit) => set({ unit })}
        />
      </View>

      {rule.unit === 'week' ? (
        <View style={styles.field}>
          <ThemedText type="smallBold">on</ThemedText>
          <WeekdayPicker value={rule.weekdays} onChange={(weekdays) => set({ weekdays })} />
          {rule.weekdays.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              none picked: {WEEKDAY_NAMES[start.getDay()]}s, like the first drop-off.
            </ThemedText>
          ) : null}
        </View>
      ) : null}

      {rule.unit === 'month' ? (
        <View style={styles.field}>
          <ThemedText type="smallBold">on</ThemedText>
          <ChipGroup
            options={[
              { value: 'weekday', label: weekdayPosition(start) },
              { value: 'date', label: datePosition(start) },
            ]}
            value={rule.monthMode}
            onChange={(monthMode) => set({ monthMode })}
          />
        </View>
      ) : null}

      <View style={styles.field}>
        <ThemedText type="smallBold">ends</ThemedText>
        <ChipGroup
          options={[
            { value: 'never', label: 'never' },
            { value: 'after', label: 'after some times' },
            { value: 'on', label: 'on a date' },
          ]}
          value={ends}
          onChange={(next: Ends) =>
            set({
              endsAfter: next === 'after' ? (rule.endsAfter ?? 4) : null,
              until: next === 'on' ? (rule.until ?? defaultUntil()) : null,
            })
          }
        />
        {ends === 'after' ? (
          <Stepper
            value={rule.endsAfter ?? 4}
            min={1}
            max={500}
            onChange={(endsAfter) => set({ endsAfter })}
            suffix={rule.endsAfter === 1 ? 'time in total' : 'times in total'}
          />
        ) : null}
        {ends === 'on' && rule.until ? (
          <Calendar
            value={parseLocalDate(rule.until)}
            min={start}
            onChange={(day) => set({ until: toLocalDateString(day) })}
          />
        ) : null}
      </View>

      <ThemedText type="smallBold" themeColor="tint">
        {describeRepeat(rule, start)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.card, borderWidth: 1 },
  field: { gap: Spacing.two },
  everyRow: { flexDirection: 'row' },
});
