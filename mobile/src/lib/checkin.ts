import { SITE_URL } from '@/lib/site';

const CODE_PATTERN = /^[A-HJ-KM-NP-Z2-9]{6}$/;

/**
 * What a pledge's QR code contains: a link to a page that shows the code, so
 * a phone's regular camera opens something useful. The code sits after the
 * "#", which browsers never send to a server.
 */
export function checkinQrValue(code: string) {
  return `${SITE_URL}/checkin.html#${code}`;
}

/**
 * The check-in code from a scanned QR code or typed text, or null if it
 * isn't one. Accepts the check-in link, the older "BYC:K7QMX4" form, and
 * typed codes like "k7qmx4" or "K7Q MX4".
 */
export function parseCheckinCode(input: string) {
  let raw = input.trim();
  if (/^https?:\/\//i.test(raw)) {
    // Only our own check-in links; any other link isn't a check-in code.
    const page = `${SITE_URL}/checkin.html#`.replace(/^https:/, '').toLowerCase();
    if (!raw.replace(/^https?:/i, '').toLowerCase().startsWith(page)) return null;
    raw = raw.slice(raw.indexOf('#') + 1);
  }
  raw = raw.toUpperCase().replace(/^BYC:/, '').replace(/[\s-]/g, '');
  return CODE_PATTERN.test(raw) ? raw : null;
}

/** "K7Q MX4": easier to read aloud in two halves. */
export function formatCheckinCode(code: string) {
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}
