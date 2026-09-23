import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { openLegalPage, PRIVACY_URL, TERMS_URL } from '@/lib/legal';

export function LegalLinks() {
  return (
    <View style={styles.row}>
      <ThemedText type="link" accessibilityRole="link" onPress={() => openLegalPage(PRIVACY_URL)}>
        privacy policy
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        ·
      </ThemedText>
      <ThemedText type="link" accessibilityRole="link" onPress={() => openLegalPage(TERMS_URL)}>
        terms of use
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.two },
});
