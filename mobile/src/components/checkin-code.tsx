import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { checkinQrValue, formatCheckinCode } from '@/lib/checkin';

/** A pledge's check-in code, with its QR code one tap away. */
export function CheckinCode({ code }: { code: string }) {
  const theme = useTheme();
  const [showQr, setShowQr] = useState(false);

  return (
    <View style={[styles.box, { backgroundColor: theme.backgroundSelected }]}>
      <View style={styles.row}>
        <View>
          <ThemedText type="small" themeColor="textSecondary">
            check-in code
          </ThemedText>
          <ThemedText type="sectionTitle" style={styles.code} accessibilityLabel={code.split('').join(' ')}>
            {formatCheckinCode(code)}
          </ThemedText>
        </View>
        <ThemedText type="link" accessibilityRole="button" onPress={() => setShowQr((v) => !v)}>
          {showQr ? 'hide qr code' : 'show qr code'}
        </ThemedText>
      </View>
      {showQr ? (
        // Always dark on light: scanners read that most reliably, in either theme.
        <View style={styles.qr}>
          <QRCode value={checkinQrValue(code)} size={180} color={Colors.light.text} backgroundColor="#FFFFFF" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: Radius.field, padding: Spacing.three, gap: Spacing.three, marginTop: Spacing.two },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  code: { letterSpacing: 3 },
  qr: { alignSelf: 'center', padding: Spacing.three, backgroundColor: '#FFFFFF', borderRadius: Radius.field },
});
