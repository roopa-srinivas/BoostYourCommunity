import * as Location from 'expo-location';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import type { Coordinates } from '@/api/needs';
import { useRegisterOrganization } from '@/api/organizations';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChipGroup } from '@/components/ui/chip';
import { ErrorText } from '@/components/ui/message';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { errorMessage } from '@/lib/format';
import { geocode, reverseGeocode } from '@/lib/geocode';
import { goBackOr } from '@/lib/navigation';
import { ORGANIZATION_KINDS, type OrganizationKind } from '@/lib/labels';

const LOCATION_TIMEOUT_MS = 15_000;
// A fix from the last few minutes is good enough to place a pin, and instant.
const RECENT_FIX_MS = 5 * 60 * 1000;

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
  /** Shown right under the location button, where the person is looking. */
  const [locationError, setLocationError] = useState<string | null>(null);
  /** Location is blocked and the phone won't ask again: offer the settings app. */
  const [needsSettings, setNeedsSettings] = useState(false);

  async function useCurrentLocation() {
    setLocationError(null);
    setNeedsSettings(false);
    setLocating(true);
    try {
      let permission = await Location.getForegroundPermissionsAsync();
      if (permission.status !== 'granted' && permission.canAskAgain) {
        permission = await Location.requestForegroundPermissionsAsync();
      }
      if (permission.status !== 'granted') {
        setNeedsSettings(!permission.canAskAgain);
        throw new Error(
          permission.canAskAgain
            ? 'allow location access to use your current location.'
            : 'location is turned off for this app. turn it on in settings, or type the address instead.',
        );
      }

      const recent = await Location.getLastKnownPositionAsync({ maxAge: RECENT_FIX_MS });
      const position =
        recent ??
        (await withTimeout(
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          LOCATION_TIMEOUT_MS,
          'we couldn’t get your location in time. try again near a window, or type the address instead.',
        ));
      const coordinates = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      setHere(coordinates);

      // Fill in the address too, so there's nothing left to type.
      if (!address.trim()) {
        const found = await reverseGeocode(coordinates);
        if (found) setAddress(found);
      }
    } catch (e) {
      setLocationError(errorMessage(e));
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
        onChangeText={setAddress}
        placeholder="street, city, state"
        autoComplete="street-address"
        hint="where donors should bring items."
      />
      {here ? (
        <Card style={styles.pinCard}>
          <ThemedText type="smallBold">map pin set to where you are now</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            donors will see the pin here and the address above.{' '}
            <ThemedText type="link" accessibilityRole="button" onPress={() => setHere(null)}>
              use the typed address instead
            </ThemedText>
          </ThemedText>
        </Card>
      ) : (
        <Button
          variant="secondary"
          label="use my current location"
          onPress={useCurrentLocation}
          loading={locating}
        />
      )}
      {locationError ? <ErrorText>{locationError}</ErrorText> : null}
      {needsSettings ? (
        <Button variant="secondary" label="open settings" onPress={() => Linking.openSettings()} />
      ) : null}
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
  pinCard: { gap: Spacing.half },
});
