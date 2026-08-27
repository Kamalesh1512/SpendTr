// Local device notification scheduling for subscription renewal reminders
// (docs/THIRD_PARTY_INTEGRATIONS.md §3, docs/ARCHITECTURE.md §4). No push
// server involved — everything here is scheduled on-device.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const ANDROID_CHANNEL_ID = 'renewal-reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function initNotifications(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Subscription renewal reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

/** Reflects OS permission, not just the in-app preference (docs/PRD.md §15). */
export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

function reminderIdentifier(subscriptionId: string): string {
  return `subscription-renewal-${subscriptionId}`;
}

export interface ReminderInput {
  id: string;
  name: string;
  nextRenewalDate: string; // ISO 8601 date
  reminderDaysBefore: number;
}

/**
 * (Re)schedules the reminder for a subscription. Called by
 * SubscriptionRepository any time next_renewal_date, reminder_days_before,
 * or is_active changes (docs/DATABASE_SCHEMA.md `recurring_subscriptions`
 * business rules). Silently does nothing if permission was denied or the
 * reminder time has already passed — reminders simply don't fire, they
 * never block the underlying write (docs/PRD.md §15 edge case).
 */
export async function scheduleRenewalReminder(input: ReminderInput): Promise<void> {
  await cancelRenewalReminder(input.id);

  const granted = await ensureNotificationPermission();
  if (!granted) return;

  const triggerDate = new Date(`${input.nextRenewalDate.slice(0, 10)}T09:00:00.000`);
  triggerDate.setDate(triggerDate.getDate() - input.reminderDaysBefore);
  if (triggerDate.getTime() <= Date.now()) return;

  await Notifications.scheduleNotificationAsync({
    identifier: reminderIdentifier(input.id),
    content: {
      title: 'Subscription renewing soon',
      body: `${input.name} renews on ${input.nextRenewalDate.slice(0, 10)}`,
      data: { subscriptionId: input.id },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
  });
}

export async function cancelRenewalReminder(subscriptionId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(reminderIdentifier(subscriptionId));
}
