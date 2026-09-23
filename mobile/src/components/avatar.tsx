import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** A circle with the person's initial, alternating green and terracotta by name. */
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const theme = useTheme();
  const warm = [...name].reduce((sum, c) => sum + c.charCodeAt(0), 0) % 2 === 0;
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2 },
        { backgroundColor: warm ? theme.accentSoft : theme.tintSoft },
      ]}>
      <ThemedText
        style={{
          fontFamily: FontFamily.display,
          fontSize: size * 0.45,
          lineHeight: size * 0.55,
          color: warm ? theme.accent : theme.tint,
        }}>
        {name.trim().charAt(0).toLowerCase() || '?'}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
});
