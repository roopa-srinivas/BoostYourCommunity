import * as Notifications from 'expo-notifications';

import { formatQuantity, formatTime, lower } from '@/lib/format';

const REMIND_BEFORE_MS = 60 * 60 * 1000;
const storageKey = (pledgeId: string) => `reminder:${pledgeId}`;

// Show reminders even when the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type ReminderNeed = {
  title: string;
  unit: string;
  organizationName: string;
  startsAt: Date;
  endsAt: Date;
};

/**
 * Reminds the donor an hour before the drop-off window opens; if that's
 * already passed, an hour before it closes; if that's passed too, not at all.
 * Asks for notification permission the first time. Never throws: a reminder
 * is a nice-to-have, not a reason to fail a pledge.
 */
export async function scheduleDropoffReminder(pledgeId: string, quantity: number, need: ReminderNeed) {
  try {
    const now = Date.now();
    const beforeStart = need.startsAt.getTime() - REMIND_BEFORE_MS;
    const beforeEnd = need.endsAt.getTime() - REMIND_BEFORE_MS;
    const when = beforeStart > now ? beforeStart : beforeEnd > now ? beforeEnd : null;
    if (when === null) return;

    const { granted } = await Notifications.requestPermissionsAsync();
    if (!granted) return;

    const opening = when === beforeStart;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: opening ? 'drop-off opens in an hour' : 'drop-off closes in an hour',
        body: `bring ${formatQuantity(quantity, need.unit)} of ${lower(need.title)} to ${lower(need.organizationName)} by ${formatTime(need.endsAt)}.`,
        data: { pledgeId },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(when) },
    });
    localStorage.setItem(storageKey(pledgeId), id);
  } catch {
    // Reminders are best effort.
  }
}

export async function cancelDropoffReminder(pledgeId: string) {
  try {
    const id = localStorage.getItem(storageKey(pledgeId));
    if (!id) return;
    await Notifications.cancelScheduledNotificationAsync(id);
    localStorage.removeItem(storageKey(pledgeId));
  } catch {
    // Reminders are best effort.
  }
}
