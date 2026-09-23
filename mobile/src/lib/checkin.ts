/** What a pledge's QR code contains: a prefix so stray QR codes are ignored. */
const QR_PREFIX = 'BYC:';

export function checkinQrValue(code: string) {
  return `${QR_PREFIX}${code}`;
}

/**
 * The check-in code from a scanned QR code or typed text, or null if it
 * isn't one. Accepts "BYC:K7QMX4", "k7qmx4" or "K7Q MX4".
 */
export function parseCheckinCode(input: string) {
  const raw = input.trim().toUpperCase().replace(/^BYC:/, '').replace(/[\s-]/g, '');
  return /^[A-HJ-KM-NP-Z2-9]{6}$/.test(raw) ? raw : null;
}

/** "K7Q MX4": easier to read aloud in two halves. */
export function formatCheckinCode(code: string) {
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}
