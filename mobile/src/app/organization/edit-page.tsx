import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { useOrganization, useUpdateOrganizationPage, type OrganizationPageFields } from '@/api/organizations';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ErrorText, Loading } from '@/components/ui/message';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { errorMessage } from '@/lib/format';
import { goBackOr } from '@/lib/navigation';

/** Owners edit what donors see on their organization's page. */
export default function EditOrganizationPageScreen() {
  const { organizationId } = useLocalSearchParams<{ organizationId: string }>();
  const organization = useOrganization(organizationId);

  if (organization.isPending) return <Loading />;
  if (!organization.data) {
    return (
      <Screen>
        <ErrorText>{organization.error ? errorMessage(organization.error) : 'organization not found.'}</ErrorText>
      </Screen>
    );
  }
  return <EditForm organizationId={organizationId} initial={organization.data} />;
}

function EditForm({ organizationId, initial }: { organizationId: string; initial: OrganizationPageFields }) {
  const update = useUpdateOrganizationPage();
  const [fields, setFields] = useState({
    description: initial.description ?? '',
    hours: initial.hours ?? '',
    accepts: initial.accepts ?? '',
    does_not_accept: initial.does_not_accept ?? '',
    phone: initial.phone ?? '',
    website: initial.website ?? '',
  });
  const set = (key: keyof typeof fields) => (value: string) => setFields((f) => ({ ...f, [key]: value }));

  async function save() {
    const clean = (value: string) => value.trim() || null;
    try {
      await update.mutateAsync({
        organizationId,
        fields: {
          description: clean(fields.description),
          hours: clean(fields.hours),
          accepts: clean(fields.accepts),
          does_not_accept: clean(fields.does_not_accept),
          phone: clean(fields.phone),
          website: clean(fields.website),
        },
      });
      goBackOr({ pathname: '/org/[id]', params: { id: organizationId } });
    } catch {
      // Shown below from update.error.
    }
  }

  return (
    <Screen>
      <ThemedText type="small" themeColor="textSecondary">
        donors see this on your organization’s page. being clear about what you can and can’t take saves everyone a
        wasted trip.
      </ThemedText>
      <TextField
        label="what you accept"
        value={fields.accepts}
        onChangeText={set('accepts')}
        multiline
        maxLength={500}
        placeholder="new socks and underwear, sealed toiletries, canned food…"
      />
      <TextField
        label="please don’t bring"
        value={fields.does_not_accept}
        onChangeText={set('does_not_accept')}
        multiline
        maxLength={500}
        placeholder="used clothing, homemade food, opened items…"
      />
      <TextField
        label="drop-off hours"
        value={fields.hours}
        onChangeText={set('hours')}
        maxLength={300}
        placeholder="weekdays 9 am – 5 pm, ring the side door"
      />
      <TextField
        label="about"
        value={fields.description}
        onChangeText={set('description')}
        multiline
        placeholder="who you serve and anything donors should know"
      />
      <TextField label="phone" value={fields.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
      <TextField
        label="website"
        value={fields.website}
        onChangeText={set('website')}
        autoCapitalize="none"
        keyboardType="url"
      />
      {update.error ? <ErrorText>{errorMessage(update.error)}</ErrorText> : null}
      <Button label="save" onPress={save} loading={update.isPending} />
    </Screen>
  );
}
