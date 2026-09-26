import { useState } from 'react';

/**
 * How far someone is willing to travel to drop off, in miles. Remembered on
 * this device (localStorage is the browser's on web and SQLite-backed on phones).
 */
export const TRAVEL_RADIUS_MILES = [1, 3, 5, 10, 15, 25] as const;
export type TravelRadius = (typeof TRAVEL_RADIUS_MILES)[number];

export const DEFAULT_TRAVEL_RADIUS: TravelRadius = 15;
const STORAGE_KEY = 'travel-radius-miles';
const METERS_PER_MILE = 1609.344;

export function milesToMeters(miles: number) {
  return miles * METERS_PER_MILE;
}

function read(): TravelRadius {
  try {
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    return (TRAVEL_RADIUS_MILES as readonly number[]).includes(stored) ? (stored as TravelRadius) : DEFAULT_TRAVEL_RADIUS;
  } catch {
    return DEFAULT_TRAVEL_RADIUS;
  }
}

export function useTravelRadius() {
  const [miles, setMiles] = useState<TravelRadius>(read);
  const choose = (next: TravelRadius) => {
    setMiles(next);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // Not remembered this time; the choice still applies until the app closes.
    }
  };
  return [miles, choose] as const;
}
