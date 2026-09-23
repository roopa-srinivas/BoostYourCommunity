import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import type { Coordinates } from '@/api/needs';

/** Downtown San Francisco, where the sample organizations are. */
export const SAN_FRANCISCO: Coordinates = { latitude: 37.7749, longitude: -122.4194 };

type UserLocation =
  | { status: 'locating'; location: null }
  | { status: 'found'; location: Coordinates }
  | { status: 'unavailable'; location: null };

// Give up if the permission prompt goes unanswered or the position takes too
// long, so the app falls back instead of spinning forever.
const LOCATION_TIMEOUT_MS = 10_000;

/** Asks for location permission once and reports the device's position. */
export function useUserLocation(): UserLocation {
  const [state, setState] = useState<UserLocation>({ status: 'locating', location: null });

  useEffect(() => {
    let settled = false;
    const settle = (next: UserLocation) => {
      if (settled) return;
      settled = true;
      setState(next);
    };
    const timeout = setTimeout(() => settle({ status: 'unavailable', location: null }), LOCATION_TIMEOUT_MS);

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') throw new Error('Location permission denied');
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const { latitude, longitude } = position.coords;
        settle({ status: 'found', location: { latitude, longitude } });
      } catch {
        settle({ status: 'unavailable', location: null });
      }
    })();

    return () => {
      settled = true;
      clearTimeout(timeout);
    };
  }, []);

  return state;
}
