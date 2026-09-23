import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamily, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** A month grid for picking one day; days before `min` are disabled. */
export function Calendar({ value, onChange, min }: { value: Date; onChange: (day: Date) => void; min: Date }) {
  const theme = useTheme();
  const [month, setMonth] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1));
  const minDay = new Date(min.getFullYear(), min.getMonth(), min.getDate());

  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = Array(month.getDay()).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(month.getFullYear(), month.getMonth(), d));
  while (cells.length % 7) cells.push(null);

  const canGoBack = month > new Date(minDay.getFullYear(), minDay.getMonth(), 1);
  const title = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toLowerCase();

  return (
    <View style={styles.box}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="previous month"
          disabled={!canGoBack}
          onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          style={[styles.nav, { opacity: canGoBack ? 1 : 0.3 }]}>
          <ThemedText type="bold" themeColor="tint">‹</ThemedText>
        </Pressable>
        <ThemedText type="smallBold">{title}</ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="next month"
          onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          style={styles.nav}>
          <ThemedText type="bold" themeColor="tint">›</ThemedText>
        </Pressable>
      </View>
      <View style={styles.grid}>
        {LETTERS.map((letter, i) => (
          <View key={`h${i}`} style={styles.cell}>
            <ThemedText type="small" themeColor="textSecondary">
              {letter}
            </ThemedText>
          </View>
        ))}
        {cells.map((day, i) =>
          day ? (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={day.toDateString()}
              accessibilityState={{ selected: sameDay(day, value), disabled: day < minDay }}
              disabled={day < minDay}
              onPress={() => onChange(day)}
              style={styles.cell}>
              <View style={[styles.dayCircle, sameDay(day, value) && { backgroundColor: theme.tint }]}>
                <ThemedText
                  style={[
                    styles.dayText,
                    { color: sameDay(day, value) ? theme.onTint : theme.text, opacity: day < minDay ? 0.3 : 1 },
                  ]}>
                  {day.getDate()}
                </ThemedText>
              </View>
            </Pressable>
          ) : (
            <View key={i} style={styles.cell} />
          ),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: Spacing.two },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nav: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, height: 44, alignItems: 'center', justifyContent: 'center' },
  dayCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontFamily: FontFamily.medium, fontSize: 15, lineHeight: 20 },
});
