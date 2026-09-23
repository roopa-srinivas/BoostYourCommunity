import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/** A thin bar showing how much of something is done, from 0 to 1. */
export function ProgressBar({ value, accessibilityLabel }: { value: number; accessibilityLabel?: string }) {
  const theme = useTheme();
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
      <View style={[styles.fill, { width: `${percent}%`, backgroundColor: theme.tint }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
});
