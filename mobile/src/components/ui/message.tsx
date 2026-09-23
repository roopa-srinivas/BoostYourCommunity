import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function ErrorText({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.error, { backgroundColor: theme.dangerSoft }]}>
      <ThemedText type="small" style={{ color: theme.danger }}>
        {children}
      </ThemedText>
    </View>
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <View style={styles.empty}>
      <ThemedText type="smallBold" style={styles.center}>
        {title}
      </ThemedText>
      {body ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          {body}
        </ThemedText>
      ) : null}
    </View>
  );
}

export function Loading() {
  return (
    <View style={styles.empty}>
      <ActivityIndicator />
    </View>
  );
}

const styles = StyleSheet.create({
  error: { padding: Spacing.three, borderRadius: Spacing.two + Spacing.one },
  empty: { paddingVertical: Spacing.five, paddingHorizontal: Spacing.three, gap: Spacing.one, alignItems: 'center' },
  center: { textAlign: 'center' },
});
