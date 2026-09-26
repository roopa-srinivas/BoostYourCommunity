import { useState } from 'react';

/**
 * How far someone is willing to travel to drop off, in miles. Remembered on
 * this device (localStorage is the browser's on web and SQLite-backed on phones).
 */
export const MIN_TRAVEL_MILES = 1;
export const MAX_TRAVEL_MILES = 50;
/** Labelled points under the slider; any whole number of miles in between works too. */
export const TRAVEL_RADIUS_MARKS = [1, 5, 10, 25, 50] as const;

export const DEFAULT_TRAVEL_RADIUS = 15;
const STORAGE_KEY = 'travel-radius-miles';
const METERS_PER_MILE = 1609.344;

export function clampMiles(miles: number) {
  return Math.min(MAX_TRAVEL_MILES, Math.max(MIN_TRAVEL_MILES, Math.round(miles)));
}

export function milesToMeters(miles: number) {
  return miles * METERS_PER_MILE;
}

function read(): number {
  try {
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(stored) && stored > 0 ? clampMiles(stored) : DEFAULT_TRAVEL_RADIUS;
  } catch {
    return DEFAULT_TRAVEL_RADIUS;
  }
}

export function useTravelRadius() {
  const [miles, setMiles] = useState<number>(read);
  const choose = (next: number) => {
    const value = clampMiles(next);
    setMiles(value);
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // Not remembered this time; the choice still applies until the app closes.
    }
  };
  return [miles, choose] as const;
}
