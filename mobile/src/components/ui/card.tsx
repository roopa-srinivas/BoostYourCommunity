import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type CardProps = ViewProps & { onPress?: () => void };

export function Card({ style, onPress, children, ...rest }: CardProps) {
  const theme = useTheme();
  const cardStyle = [
    styles.card,
    { backgroundColor: theme.backgroundElement, boxShadow: `0 1px 3px ${theme.shadow}` },
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        {...rest}
        onPress={onPress}
        style={({ pressed }) => [cardStyle, pressed && styles.pressed]}>
        {children}
      </Pressable>
    );
  }
  return (
    <View style={cardStyle} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.card, padding: Spacing.three, gap: Spacing.one },
  pressed: { opacity: 0.8 },
});
