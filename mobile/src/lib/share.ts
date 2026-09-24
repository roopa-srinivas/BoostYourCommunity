import { Platform, Share } from 'react-native';

import { formatQuantity, formatTime, lower } from './format';
import { SITE_URL } from './site';

/** The public page for a need, which works for people without the app. */
export function needShareUrl(needId: string) {
  return `${SITE_URL}/need.html#${needId}`;
}

// A shared message is read later, so dates are absolute ("thu, sep 24"), not "today".
function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toLowerCase();
}

export type ShareableNeed = {
  id: string;
  title: string;
  unit: string;
  remaining: number;
  organizationName: string;
  startsAt: string;
  endsAt: string;
};

/** "can you help? sunset family closet still needs 30 coats for “kids’ winter coats”, drop-off thu, sep 24, 6 pm – 9 pm." */
export function needShareMessage(need: ShareableNeed) {
  const start = new Date(need.startsAt);
  const end = new Date(need.endsAt);
  const sameDay = start.toDateString() === end.toDateString();
  const window = sameDay
    ? `${formatDate(start)}, ${formatTime(start)} – ${formatTime(end)}`
    : `${formatDate(start)}, ${formatTime(start)} – ${formatDate(end)}, ${formatTime(end)}`;
  return (
    `can you help? ${lower(need.organizationName)} still needs ${formatQuantity(need.remaining, need.unit)} ` +
    `for “${lower(need.title)}”, drop-off ${window}.`
  );
}

/**
 * Opens the share sheet, or copies the link where there isn't one (most
 * desktop browsers). Returns what happened so the button can say so.
 */
export async function shareNeed(need: ShareableNeed): Promise<'shared' | 'copied' | 'dismissed'> {
  const message = needShareMessage(need);
  const url = needShareUrl(need.id);

  if (Platform.OS === 'web') {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ text: message, url });
        return 'shared';
      } catch {
        return 'dismissed';
      }
    }
    await navigator.clipboard.writeText(`${message} ${url}`);
    return 'copied';
  }

  // iOS shows the url as a link preview; Android only takes a message.
  const result = await Share.share(Platform.OS === 'ios' ? { message, url } : { message: `${message} ${url}` });
  return result.action === Share.dismissedAction ? 'dismissed' : 'shared';
}
