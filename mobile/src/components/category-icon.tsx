import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { NeedCategory } from '@/lib/labels';

const ICONS: Record<NeedCategory, { symbol: SymbolViewProps['name']; warm: boolean }> = {
  food: { symbol: { ios: 'fork.knife', android: 'restaurant', web: 'restaurant' }, warm: true },
  water: { symbol: { ios: 'drop.fill', android: 'water_drop', web: 'water_drop' }, warm: false },
  clothing: { symbol: { ios: 'tshirt.fill', android: 'checkroom', web: 'checkroom' }, warm: true },
  hygiene: { symbol: { ios: 'bubbles.and.sparkles.fill', android: 'soap', web: 'soap' }, warm: false },
  other: { symbol: { ios: 'shippingbox.fill', android: 'inventory_2', web: 'inventory_2' }, warm: true },
};

/** A rounded tile with the category's icon, alternating terracotta and green. */
export function CategoryIcon({ category, size = 48 }: { category: NeedCategory; size?: number }) {
  const theme = useTheme();
  const { symbol, warm } = ICONS[category];
  return (
    <View
      style={[
        styles.tile,
        { width: size, height: size, backgroundColor: warm ? theme.accentSoft : theme.tintSoft },
      ]}>
      <SymbolView name={symbol} size={size / 2} tintColor={warm ? theme.accent : theme.tint} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { borderRadius: Radius.tile, alignItems: 'center', justifyContent: 'center' },
});
