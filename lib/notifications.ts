import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Notification channel ID for Android
const NAP_CHANNEL_ID = 'nap-timer';

// Notification ID for active nap (we use a fixed ID so we can update it)
const NAP_NOTIFICATION_ID = 'active-nap';

// Action identifiers
export const STOP_NAP_ACTION = 'STOP_NAP';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Format seconds to HH:MM:SS or MM:SS
const formatTime = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}h ${mins.toString().padStart(2, '0')}min`;
  }
  return `${mins}min ${secs.toString().padStart(2, '0')}s`;
};

// Initialize notification settings
export async function initializeNotifications(): Promise<boolean> {
  if (!Device.isDevice) {
    console.log('Notifications only work on physical devices');
    return false;
  }

  // Request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Notification permission not granted');
    return false;
  }

  // Set up Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(NAP_CHANNEL_ID, {
      name: 'Soneca Ativa',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: null, // No sound for timer updates
    });
  }

  // Set up notification categories with actions (iOS)
  await Notifications.setNotificationCategoryAsync('nap-timer', [
    {
      identifier: STOP_NAP_ACTION,
      buttonTitle: 'Parar Soneca',
      options: {
        opensAppToForeground: true,
      },
    },
  ]);

  return true;
}

// Show or update the nap notification
export async function showNapNotification(
  babyName: string,
  babyGender: 'masculino' | 'feminino',
  elapsedSeconds: number
): Promise<void> {
  const genderEmoji = babyGender === 'masculino' ? '👶🏻' : '👶🏻';
  const sleepEmoji = '😴';

  await Notifications.scheduleNotificationAsync({
    identifier: NAP_NOTIFICATION_ID,
    content: {
      title: `${sleepEmoji} ${babyName} está dormindo`,
      body: `Duração: ${formatTime(elapsedSeconds)}`,
      data: { type: 'nap-timer' },
      categoryIdentifier: 'nap-timer',
      sticky: true, // Android: notification can't be swiped away
      ...(Platform.OS === 'android' && {
        channelId: NAP_CHANNEL_ID,
      }),
    },
    trigger: null, // Show immediately
  });
}

// Dismiss the nap notification
export async function dismissNapNotification(): Promise<void> {
  await Notifications.dismissNotificationAsync(NAP_NOTIFICATION_ID);
}

// Add listener for notification responses (when user taps notification or action)
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

// Check if action is stop nap
export function isStopNapAction(response: Notifications.NotificationResponse): boolean {
  return response.actionIdentifier === STOP_NAP_ACTION;
}
