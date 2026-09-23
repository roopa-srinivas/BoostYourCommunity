import * as Location from 'expo-location';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Coordinates } from '@/api/needs';
import { useRegisterOrganization } from '@/api/organizations';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ChipGroup } from '@/components/ui/chip';
import { ErrorText } from '@/components/ui/message';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { errorMessage } from '@/lib/format';
import { geocode } from '@/lib/geocode';
import { goBackOr } from '@/lib/navigation';
import { ORGANIZATION_KINDS, type OrganizationKind } from '@/lib/labels';

const LOCATION_TIMEOUT_MS = 10_000;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string) {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}

export default function RegisterOrganizationScreen() {
  const register = useRegisterOrganization();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<OrganizationKind>('shelter');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [here, setHere] = useState<Coordinates | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function useCurrentLocation() {
    setError(null);
    setLocating(true);
    try {
      const position = await withTimeout(
        (async () => {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') throw new Error('allow location access to use your current location.');
          return Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        })(),
        LOCATION_TIMEOUT_MS,
        'we couldn’t get your location. check that location access is allowed, or enter the address instead.',
      );
      setHere({ latitude: position.coords.latitude, longitude: position.coords.longitude });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLocating(false);
    }
  }

  async function submit() {
    setError(null);
    if (name.trim().length < 2 || !address.trim()) {
      setError('enter your organization’s name and street address.');
      return;
    }
    const location = here ?? (await geocode(address.trim()));
    if (!location) {
      setError(
        'we couldn’t find that address on the map. check it, or tap “use my current location” if you’re there now.',
      );
      return;
    }
    try {
      await register.mutateAsync({
        name: name.trim(),
        kind,
        address: address.trim(),
        description: description.trim() || null,
        phone: phone.trim() || null,
        website: website.trim() || null,
        location,
      });
      goBackOr('/organization');
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <Screen>
      <ThemedText type="small" themeColor="textSecondary">
        after you register, we review your organization before donors can see it. you’ll be its owner and can post
        needs once it’s approved.
      </ThemedText>

      <TextField label="organization name" value={name} onChangeText={setName} />
      <View style={styles.field}>
        <ThemedText type="smallBold">type</ThemedText>
        <ChipGroup options={ORGANIZATION_KINDS} value={kind} onChange={setKind} />
      </View>
      <TextField
        label="drop-off address"
        value={address}
        onChangeText={(text) => {
          setAddress(text);
          setHere(null);
        }}
        placeholder="street, city, state"
        autoComplete="street-address"
        hint={here ? 'using your current location for the map pin.' : 'where donors should bring items.'}
      />
      <Button
        variant="secondary"
        label="use my current location"
        onPress={useCurrentLocation}
        loading={locating}
      />
      <TextField
        label="about (optional)"
        value={description}
        onChangeText={setDescription}
        multiline
        placeholder="who you serve, hours, anything donors should know"
      />
      <TextField label="phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextField
        label="website (optional)"
        value={website}
        onChangeText={setWebsite}
        autoCapitalize="none"
        keyboardType="url"
      />

      {error ? <ErrorText>{error}</ErrorText> : null}
      <Button label="register organization" onPress={submit} loading={register.isPending} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.one },
});
