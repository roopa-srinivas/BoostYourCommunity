import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress: () => void;
};

export function Chip({ label, selected, onPress }: ChipProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? theme.tint : theme.backgroundElement,
          boxShadow: selected ? undefined : `0 1px 2px ${theme.shadow}`,
          opacity: pressed ? 0.8 : 1,
        },
      ]}>
      <ThemedText
        type="small"
        style={{ color: selected ? theme.onTint : theme.text, fontFamily: selected ? FontFamily.bold : FontFamily.medium }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

type ChipGroupProps<T extends string | number> = {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Scroll horizontally instead of wrapping onto more lines. */
  scroll?: boolean;
};

export function ChipGroup<T extends string | number>({ options, value, onChange, scroll }: ChipGroupProps<T>) {
  const chips = options.map((option) => (
    <Chip
      key={option.value}
      label={option.label}
      selected={option.value === value}
      onPress={() => onChange(option.value)}
    />
  ));

  if (scroll) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {chips}
      </ScrollView>
    );
  }
  return <View style={[styles.row, styles.wrap]}>{chips}</View>;
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.pill,
  },
  row: { flexDirection: 'row', gap: Spacing.two, paddingVertical: Spacing.half },
  wrap: { flexWrap: 'wrap' },
});
