import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { usePledgeByCode, useResolvePledge } from '@/api/pledges';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorText, Loading } from '@/components/ui/message';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Radius, Spacing } from '@/constants/theme';
import { formatCheckinCode, parseCheckinCode } from '@/lib/checkin';
import { errorMessage, formatQuantity, formatWindow, lower } from '@/lib/format';
import { PLEDGE_STATUS } from '@/lib/labels';

/** Staff scan a donor's QR code (or type the code) and confirm the drop-off. */
export default function CheckinScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [typed, setTyped] = useState('');
  const [code, setCode] = useState<string | null>(null);
  const [typedError, setTypedError] = useState<string | null>(null);
  const pledge = usePledgeByCode(code);
  const resolve = useResolvePledge();
  const [confirmed, setConfirmed] = useState(false);

  function lookUp(input: string) {
    const parsed = parseCheckinCode(input);
    if (!parsed) {
      setTypedError('check-in codes are 6 letters and numbers, like K7Q MX4.');
      return;
    }
    setTypedError(null);
    setConfirmed(false);
    resolve.reset();
    setCode(parsed);
  }

  function reset() {
    setCode(null);
    setTyped('');
    setConfirmed(false);
    resolve.reset();
  }

  async function markReceived(pledgeId: string) {
    try {
      await resolve.mutateAsync({ pledgeId, outcome: 'received' });
      setConfirmed(true);
    } catch {
      // Shown below from resolve.error.
    }
  }

  // Scanning pauses while a result is on screen, so one QR code can't trigger twice.
  const scanning = !code;

  return (
    <Screen>
      {scanning ? (
        <>
          {permission?.granted ? (
            <View style={styles.cameraFrame}>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={({ data }) => {
                  if (parseCheckinCode(data)) lookUp(data);
                }}
              />
            </View>
          ) : (
            <Card style={styles.gap}>
              <ThemedText type="bold">scan the donor’s qr code</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                donors find it in my pledges. you can also type the code below.
              </ThemedText>
              {permission && !permission.canAskAgain ? (
                <ThemedText type="small" themeColor="textSecondary">
                  camera access is turned off for this app. turn it on in settings to scan.
                </ThemedText>
              ) : (
                <Button label="turn on the camera" onPress={requestPermission} />
              )}
            </Card>
          )}

          <TextField
            label="or type the code"
            value={typed}
            onChangeText={setTyped}
            placeholder="K7Q MX4"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={10}
            onSubmitEditing={() => lookUp(typed)}
          />
          {typedError ? <ErrorText>{typedError}</ErrorText> : null}
          <Button variant="secondary" label="look up" onPress={() => lookUp(typed)} />
        </>
      ) : pledge.isPending ? (
        <Loading />
      ) : pledge.error ? (
        <>
          <ErrorText>{errorMessage(pledge.error)}</ErrorText>
          <Button variant="secondary" label="try again" onPress={reset} />
        </>
      ) : !pledge.data ? (
        <>
          <Card style={styles.gap}>
            <ThemedText type="bold">no pledge with code {formatCheckinCode(code)}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              check the code with the donor. codes only work at the organization they pledged to.
            </ThemedText>
          </Card>
          <Button label="scan another" onPress={reset} />
        </>
      ) : (
        <PledgeResult
          pledge={pledge.data}
          confirmed={confirmed}
          confirming={resolve.isPending}
          error={resolve.error ? errorMessage(resolve.error) : null}
          onConfirm={() => markReceived(pledge.data!.id)}
          onNext={reset}
        />
      )}
    </Screen>
  );
}

type Pledge = NonNullable<ReturnType<typeof usePledgeByCode>['data']>;

function PledgeResult({
  pledge,
  confirmed,
  confirming,
  error,
  onConfirm,
  onNext,
}: {
  pledge: Pledge;
  confirmed: boolean;
  confirming: boolean;
  error: string | null;
  onConfirm: () => void;
  onNext: () => void;
}) {
  const status = confirmed ? PLEDGE_STATUS.received : PLEDGE_STATUS[pledge.status];
  const need = pledge.need;
  const canConfirm = !confirmed && (pledge.status === 'pledged' || pledge.status === 'no_show');

  return (
    <>
      <Card style={styles.gap}>
        <Badge label={status.label} tone={status.tone} />
        <ThemedText type="subtitle">
          {formatQuantity(pledge.quantity, need?.unit ?? 'items')}
        </ThemedText>
        <ThemedText type="bold">{lower(need?.title)}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          from {pledge.donor?.display_name ?? 'a donor'} · code {formatCheckinCode(pledge.checkin_code)}
        </ThemedText>
        {need ? (
          <ThemedText type="small" themeColor="textSecondary">
            {lower(need.organization?.name)} · drop off {formatWindow(need.dropoff_starts_at, need.dropoff_ends_at)}
          </ThemedText>
        ) : null}
      </Card>

      {error ? <ErrorText>{error}</ErrorText> : null}
      {confirmed ? (
        <ThemedText type="sectionTitle">checked in. thank you!</ThemedText>
      ) : pledge.status === 'received' ? (
        <ThemedText>this drop-off was already checked in.</ThemedText>
      ) : pledge.status === 'cancelled' ? (
        <ThemedText>the donor cancelled this pledge.</ThemedText>
      ) : null}

      {canConfirm ? <Button label="mark received" onPress={onConfirm} loading={confirming} /> : null}
      <Button variant={canConfirm ? 'secondary' : 'primary'} label="scan another" onPress={onNext} />
    </>
  );
}

const styles = StyleSheet.create({
  cameraFrame: { height: 320, borderRadius: Radius.card, overflow: 'hidden' },
  gap: { gap: Spacing.two },
});
