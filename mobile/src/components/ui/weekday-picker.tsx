import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { WEEKDAY_NAMES } from '@/lib/repeat';

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Seven round toggles, Sunday first; any combination can be on. */
export function WeekdayPicker({ value, onChange }: { value: number[]; onChange: (days: number[]) => void }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      {LETTERS.map((letter, day) => {
        const on = value.includes(day);
        return (
          <Pressable
            key={day}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            accessibilityLabel={WEEKDAY_NAMES[day]}
            onPress={() => onChange(on ? value.filter((d) => d !== day) : [...value, day].sort())}
            style={({ pressed }) => [
              styles.day,
              { backgroundColor: on ? theme.tint : theme.backgroundSelected, opacity: pressed ? 0.8 : 1 },
            ]}>
            <ThemedText style={[styles.letter, { color: on ? theme.onTint : theme.text }]}>{letter}</ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  day: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  letter: { fontFamily: FontFamily.bold, fontSize: 15, lineHeight: 20 },
});
