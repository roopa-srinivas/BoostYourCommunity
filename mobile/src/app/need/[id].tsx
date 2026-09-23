import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { useNeed } from '@/api/needs';
import { useCreatePledge } from '@/api/pledges';
import { CategoryIcon } from '@/components/category-icon';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorText, Loading } from '@/components/ui/message';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { Stepper } from '@/components/ui/stepper';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatCheckinCode } from '@/lib/checkin';
import { openDirections } from '@/lib/directions';
import { errorMessage, formatQuantity, formatWindow, lower } from '@/lib/format';
import { categoryLabel } from '@/lib/labels';
import { scheduleDropoffReminder } from '@/lib/reminders';
import { formatClosesIn, isClosingSoon } from '@/lib/urgency';

export default function NeedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const need = useNeed(id);
  const createPledge = useCreatePledge();
  const [quantity, setQuantity] = useState(1);
  const [pledged, setPledged] = useState<{ quantity: number; code: string } | null>(null);

  if (need.isPending) return <Loading />;
  if (need.error || !need.data) {
    return (
      <Screen>
        <ErrorText>{need.error ? errorMessage(need.error) : 'this need could not be found.'}</ErrorText>
      </Screen>
    );
  }

  const { data } = need;
  const organization = data.organization;
  const remaining = data.quantity_needed - data.quantity_committed;
  const pledgeQuantity = Math.min(quantity, remaining);
  const window = formatWindow(data.dropoff_starts_at, data.dropoff_ends_at);
  const closingSoon = isClosingSoon(data.dropoff_ends_at);
  const acceptingPledges = data.status === 'open' && new Date(data.dropoff_ends_at) > new Date() && remaining > 0;

  async function pledge() {
    try {
      const created = await createPledge.mutateAsync({ needId: data.id, quantity: pledgeQuantity });
      setPledged({ quantity: pledgeQuantity, code: created.checkin_code });
      void scheduleDropoffReminder(created.id, pledgeQuantity, {
        title: data.title,
        unit: data.unit,
        organizationName: organization?.name ?? 'the organization',
        startsAt: new Date(data.dropoff_starts_at),
        endsAt: new Date(data.dropoff_ends_at),
      });
    } catch {
      // Shown below from createPledge.error.
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: '' }} />

      <View style={styles.hero}>
        <CategoryIcon category={data.category} size={56} />
        <ThemedText type="small" themeColor="textSecondary">
          {categoryLabel(data.category)}
        </ThemedText>
        <ThemedText type="subtitle">{lower(data.title)}</ThemedText>
        {data.details ? <ThemedText themeColor="textSecondary">{lower(data.details)}</ThemedText> : null}
      </View>

      <Card style={styles.cardGap}>
        <ThemedText>
          <ThemedText type="bold">{formatQuantity(remaining, data.unit)}</ThemedText> still needed ·{' '}
          {data.quantity_committed} pledged so far
        </ThemedText>
        <ProgressBar
          value={data.quantity_committed / data.quantity_needed}
          accessibilityLabel={`${data.quantity_committed} of ${data.quantity_needed} pledged`}
        />
        <ThemedText type="small" themeColor="textSecondary">
          drop off {window}
        </ThemedText>
        {closingSoon ? (
          <ThemedText type="smallBold" themeColor="accent">
            {formatClosesIn(data.dropoff_ends_at)}
          </ThemedText>
        ) : null}
        {data.repeats_weekly ? (
          <ThemedText type="small" themeColor="textSecondary">
            this need comes back every week.
          </ThemedText>
        ) : null}
      </Card>

      {organization ? (
        <Card style={styles.cardGap}>
          <View>
            <ThemedText type="bold">{lower(organization.name)}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {lower(organization.address)}
            </ThemedText>
            {organization.phone ? (
              <ThemedText type="small" themeColor="textSecondary">
                {organization.phone}
              </ThemedText>
            ) : null}
          </View>
          <View style={styles.row}>
            <Button
              variant="secondary"
              label="about them"
              style={styles.flex}
              onPress={() => router.push({ pathname: '/org/[id]', params: { id: organization.id } })}
            />
            <Button
              variant="secondary"
              label="directions"
              style={styles.flex}
              onPress={() => openDirections(organization.address)}
            />
          </View>
        </Card>
      ) : null}

      {pledged !== null ? (
        <Card style={styles.cardGap}>
          <ThemedText type="sectionTitle">thank you!</ThemedText>
          <ThemedText>
            you pledged {formatQuantity(pledged.quantity, data.unit)}. please drop them off at {lower(organization?.name)},{' '}
            {window}. the staff will confirm when they arrive.
            {Platform.OS === 'web' ? '' : ' we’ll send you a reminder too.'}
          </ThemedText>
          <View style={[styles.code, { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText type="small" themeColor="textSecondary">
              your check-in code
            </ThemedText>
            <ThemedText type="title" style={styles.codeText} accessibilityLabel={pledged.code.split('').join(' ')}>
              {formatCheckinCode(pledged.code)}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
              show it at drop-off. it’s also in my pledges, with a qr code.
            </ThemedText>
          </View>
          <Button label="see my pledges" onPress={() => router.dismissTo('/pledges')} />
        </Card>
      ) : acceptingPledges ? (
        <View style={styles.pledge}>
          <ThemedText type="sectionTitle">how many can you bring?</ThemedText>
          <Stepper value={pledgeQuantity} max={remaining} onChange={setQuantity} suffix={data.unit} />
          {createPledge.error ? <ErrorText>{errorMessage(createPledge.error)}</ErrorText> : null}
          <Button
            label={`pledge ${formatQuantity(pledgeQuantity, data.unit)}`}
            onPress={pledge}
            loading={createPledge.isPending}
          />
        </View>
      ) : (
        <Card>
          <ThemedText>
            {remaining <= 0
              ? 'this need is fully pledged. thank you, everyone!'
              : 'this need is no longer taking pledges.'}
          </ThemedText>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: Spacing.one, alignItems: 'flex-start' },
  cardGap: { gap: Spacing.two },
  pledge: { gap: Spacing.three, alignItems: 'stretch' },
  row: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
  code: { alignItems: 'center', gap: Spacing.half, padding: Spacing.three, borderRadius: Radius.field },
  codeText: { letterSpacing: 4 },
  center: { textAlign: 'center' },
});
