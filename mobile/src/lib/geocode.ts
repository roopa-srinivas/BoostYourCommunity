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
