import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import type { Coordinates } from '@/api/needs';

/** Downtown San Francisco, where the sample organizations are. */
export const SAN_FRANCISCO: Coordinates = { latitude: 37.7749, longitude: -122.4194 };

type UserLocation =
  | { status: 'locating'; location: null }
  | { status: 'found'; location: Coordinates }
  | { status: 'unavailable'; location: null };

/** Asks for location permission once and reports the device's position. */
export function useUserLocation(): UserLocation {
  const [state, setState] = useState<UserLocation>({ status: 'locating', location: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') throw new Error('Location permission denied');
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const { latitude, longitude } = position.coords;
        if (!cancelled) setState({ status: 'found', location: { latitude, longitude } });
      } catch {
        if (!cancelled) setState({ status: 'unavailable', location: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
