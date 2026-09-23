import * as Location from 'expo-location';

import type { Coordinates } from '@/api/needs';

/** Finds coordinates for an address using the phone's built-in geocoder. */
export async function geocode(address: string): Promise<Coordinates | null> {
  try {
    const [result] = await Location.geocodeAsync(address);
    return result ? { latitude: result.latitude, longitude: result.longitude } : null;
  } catch {
    return null;
  }
}

/** A readable street address for coordinates, or null if none is found. */
export async function reverseGeocode({ latitude, longitude }: Coordinates): Promise<string | null> {
  try {
    const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (!place) return null;
    const street = [place.streetNumber, place.street].filter(Boolean).join(' ');
    return [street || place.name, place.city, place.region].filter(Boolean).join(', ') || null;
  } catch {
    return null;
  }
}
