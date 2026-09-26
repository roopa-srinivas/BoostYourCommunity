import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ScreenProps = ScrollViewProps & {
  /** Enables pull-to-refresh; the spinner shows until the returned promise settles. */
  onRefresh?: () => Promise<unknown>;
  /**
   * For tab screens without a header: shows the title at the top of the page
   * and handles the top safe area, like Give.
   */
  title?: string;
  /** A tab screen without a header that draws its own top (Give). */
  headerless?: boolean;
};

/** Scrollable page body with consistent padding and a readable max width. */
export function Screen({ children, onRefresh, title, headerless, contentContainerStyle, ...rest }: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const ownTop = headerless || !!title;
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
      contentInsetAdjustmentBehavior={ownTop ? 'never' : 'automatic'}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? <RefreshControl refreshing={pulling} onRefresh={refresh} /> : undefined
      }
      contentContainerStyle={[
        styles.outer,
        // Just clear the status bar / notch, with a small gap.
        ownTop ? { paddingTop: insets.top + Spacing.two } : null,
        contentContainerStyle,
      ]}
      {...rest}>
      <View style={styles.inner}>
        {title ? (
          <ThemedText type="title" accessibilityRole="header">
            {title}
          </ThemedText>
        ) : null}
        {children}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  outer: { alignItems: 'center', padding: Spacing.three, paddingBottom: Spacing.six },
  inner: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.three },
});
