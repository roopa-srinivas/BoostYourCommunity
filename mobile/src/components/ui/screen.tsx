import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ScreenProps = ScrollViewProps & {
  /** Enables pull-to-refresh; the spinner shows until the returned promise settles. */
  onRefresh?: () => Promise<unknown>;
};

/** Scrollable page body with consistent padding and a readable max width. */
export function Screen({ children, onRefresh, contentContainerStyle, ...rest }: ScreenProps) {
  const theme = useTheme();
  // Only show the spinner for a refresh the person pulled for. Tying it to
  // background refetches shows it on every screen open, and on iOS a
  // spinner that appears without a pull gets stuck until you scroll.
  const [pulling, setPulling] = useState(false);

  async function refresh() {
    setPulling(true);
    try {
      await onRefresh?.();
    } finally {
      setPulling(false);
    }
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? <RefreshControl refreshing={pulling} onRefresh={refresh} /> : undefined
      }
      contentContainerStyle={[styles.outer, contentContainerStyle]}
      {...rest}>
      <View style={styles.inner}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  outer: { alignItems: 'center', padding: Spacing.three, paddingBottom: Spacing.six },
  inner: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.three },
});
