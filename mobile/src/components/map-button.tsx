import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export const MAP_ICONS = {
  expand: { ios: 'arrow.up.left.and.arrow.down.right', android: 'open_in_full', web: 'open_in_full' },
  recenter: { ios: 'location.fill', android: 'my_location', web: 'my_location' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
} satisfies Record<string, SymbolViewProps['name']>;

/** A round floating button over a map: expand, recenter, close. */
export function MapButton({
  icon,
  label,
  onPress,
  size = 36,
  style,
}: {
  icon: keyof typeof MAP_ICONS;
  label: string;
  onPress: () => void;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={[
        styles.button,
        { width: size, height: size, borderRadius: size / 2 },
        { backgroundColor: theme.backgroundElement, boxShadow: `0 1px 3px ${theme.shadow}` },
        style,
      ]}>
      <SymbolView
        name={MAP_ICONS[icon]}
        size={size * 0.45}
        tintColor={icon === 'recenter' ? theme.tint : theme.text}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});
