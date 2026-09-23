// Scheduled notifications aren't available in the browser; the web app skips reminders.

type ReminderNeed = {
  title: string;
  unit: string;
  organizationName: string;
  startsAt: Date;
  endsAt: Date;
};

export async function scheduleDropoffReminder(_pledgeId: string, _quantity: number, _need: ReminderNeed) {}

export async function cancelDropoffReminder(_pledgeId: string) {}
