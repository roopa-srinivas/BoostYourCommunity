import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useNeed } from '@/api/needs';
import { useCreatePledge } from '@/api/pledges';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorText, Loading } from '@/components/ui/message';
import { Screen } from '@/components/ui/screen';
import { Stepper } from '@/components/ui/stepper';
import { Spacing } from '@/constants/theme';
import { openDirections } from '@/lib/directions';
import { errorMessage, formatQuantity, formatWindow } from '@/lib/format';
import { categoryLabel } from '@/lib/labels';

export default function NeedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const need = useNeed(id);
  const createPledge = useCreatePledge();
  const [quantity, setQuantity] = useState(1);
  const [pledged, setPledged] = useState<number | null>(null);

  if (need.isPending) return <Loading />;
  if (need.error || !need.data) {
    return (
      <Screen>
        <ErrorText>{need.error ? errorMessage(need.error) : 'This need could not be found.'}</ErrorText>
      </Screen>
    );
  }

  const { data } = need;
  const organization = data.organization;
  const remaining = data.quantity_needed - data.quantity_committed;
  const pledgeQuantity = Math.min(quantity, remaining);
  const window = formatWindow(data.dropoff_starts_at, data.dropoff_ends_at);
  const acceptingPledges = data.status === 'open' && new Date(data.dropoff_ends_at) > new Date() && remaining > 0;

  async function pledge() {
    try {
      await createPledge.mutateAsync({ needId: data.id, quantity: pledgeQuantity });
      setPledged(pledgeQuantity);
    } catch {
      // Shown below from createPledge.error.
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: organization?.name ?? 'Need' }} />

      <View style={styles.section}>
        <Badge label={categoryLabel(data.category)} tone="info" />
        <ThemedText type="subtitle" style={styles.title}>
          {data.title}
        </ThemedText>
        {data.details ? <ThemedText>{data.details}</ThemedText> : null}
      </View>

      <Card>
        <ThemedText type="smallBold">
          {remaining} of {data.quantity_needed} {data.unit} still needed
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Drop off {window}
        </ThemedText>
      </Card>

      {organization ? (
        <Card>
          <ThemedText type="smallBold">{organization.name}</ThemedText>
          <ThemedText type="small">{organization.address}</ThemedText>
          {organization.phone ? (
            <ThemedText type="small" themeColor="textSecondary">
              {organization.phone}
            </ThemedText>
          ) : null}
          <Button
            variant="secondary"
            label="Get directions"
            onPress={() => openDirections(organization.address)}
            style={styles.cardButton}
          />
        </Card>
      ) : null}

      {pledged !== null ? (
        <Card>
          <ThemedText type="smallBold">
            Thank you! You pledged {formatQuantity(pledged, data.unit)}.
          </ThemedText>
          <ThemedText type="small">
            Please drop them off at {organization?.name} {window}. The staff will confirm when they arrive.
          </ThemedText>
          <Button label="See my pledges" onPress={() => router.dismissTo('/pledges')} style={styles.cardButton} />
        </Card>
      ) : acceptingPledges ? (
        <View style={styles.section}>
          <ThemedText type="smallBold">How many can you bring?</ThemedText>
          <Stepper value={pledgeQuantity} max={remaining} onChange={setQuantity} suffix={data.unit} />
          {createPledge.error ? <ErrorText>{errorMessage(createPledge.error)}</ErrorText> : null}
          <Button
            label={`Pledge ${formatQuantity(pledgeQuantity, data.unit)}`}
            onPress={pledge}
            loading={createPledge.isPending}
          />
        </View>
      ) : (
        <Card>
          <ThemedText type="small">
            {remaining <= 0
              ? 'This need is fully pledged. Thank you, everyone!'
              : 'This need is no longer taking pledges.'}
          </ThemedText>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two },
  title: { fontSize: 26, lineHeight: 32 },
  cardButton: { marginTop: Spacing.two },
});
