import type { Coordinates } from '@/api/needs';

/**
 * Browsers have no built-in geocoder, so the web app uses OpenStreetMap's
 * Nominatim. Its usage policy allows light use (about 1 request per second),
 * which fits organization registration. See
 * https://operations.osmfoundation.org/policies/nominatim/
 */
export async function geocode(address: string): Promise<Coordinates | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(address)}`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) return null;
    const [result] = (await response.json()) as { lat: string; lon: string }[];
    return result ? { latitude: Number(result.lat), longitude: Number(result.lon) } : null;
  } catch {
    return null;
  }
}

/** A readable street address for coordinates, via Nominatim, or null. */
export async function reverseGeocode({ latitude, longitude }: Coordinates): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) return null;
    const result = (await response.json()) as {
      address?: { house_number?: string; road?: string; city?: string; town?: string; state?: string };
    };
    const a = result.address;
    if (!a) return null;
    const street = [a.house_number, a.road].filter(Boolean).join(' ');
    return [street, a.city ?? a.town, a.state].filter(Boolean).join(', ') || null;
  } catch {
    return null;
  }
}
