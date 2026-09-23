import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type StepperProps = {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  suffix?: string;
};

export function Stepper({ value, min = 1, max, onChange, suffix }: StepperProps) {
  const theme = useTheme();
  const step = (delta: number) => onChange(Math.min(max, Math.max(min, value + delta)));

  const button = (label: string, delta: number, disabled: boolean, accessibilityLabel: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={() => step(delta)}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme.backgroundSelected, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
      ]}>
      <ThemedText type="subtitle" style={styles.buttonLabel}>
        {label}
      </ThemedText>
    </Pressable>
  );

  return (
    <View style={styles.row}>
      {button('−', -1, value <= min, 'Decrease')}
      <View style={styles.value} accessibilityLiveRegion="polite">
        <ThemedText type="subtitle">{value}</ThemedText>
        {suffix ? (
          <ThemedText type="small" themeColor="textSecondary">
            {suffix}
          </ThemedText>
        ) : null}
      </View>
      {button('+', 1, value >= max, 'Increase')}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  button: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  buttonLabel: { lineHeight: 34 },
  value: { minWidth: 80, alignItems: 'center' },
});
