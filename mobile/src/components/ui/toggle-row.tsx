import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ToggleRowProps = {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

/** A labeled on/off switch; the whole row is tappable. */
export function ToggleRow({ label, hint, value, onChange }: ToggleRowProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      onPress={() => onChange(!value)}
      style={[styles.row, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={styles.text}>
        <ThemedText type="smallBold">{label}</ThemedText>
        {hint ? (
          <ThemedText type="small" themeColor="textSecondary">
            {hint}
          </ThemedText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: theme.tint, false: theme.backgroundSelected }}
        thumbColor={theme.backgroundElement}
        ios_backgroundColor={theme.backgroundSelected}
        // The row handles taps and announces the state for screen readers.
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.field,
    borderWidth: 1,
  },
  text: { flex: 1, gap: Spacing.half },
});
