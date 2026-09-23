import { Linking, Platform } from 'react-native';

/** Opens turn-by-turn directions to an address in the platform's maps app. */
export function openDirections(address: string) {
  const destination = encodeURIComponent(address);
  const url =
    Platform.OS === 'ios'
      ? `https://maps.apple.com/?daddr=${destination}`
      : `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
  return Linking.openURL(url);
}
