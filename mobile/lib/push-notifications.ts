import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { supabase } from './supabase';
import { useAuth } from './auth-context';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('Push notifications only work on physical devices');
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  // Android channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('pasa', {
      name:       'PASA Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#38bdf8',
    });
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  return token;
}

/** Call this hook once in the root layout to register and store the push token */
export function useMobilePushNotifications() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    registerForPushNotifications().then(async (token) => {
      if (!token) return;
      // Store token in DB — server uses this to send Expo push notifications
      await (supabase as any).from('push_subscriptions').upsert({
        user_id:   user.id,
        endpoint:  token,          // reuse endpoint column for Expo token
        user_agent: `expo/${Platform.OS}`,
      }, { onConflict: 'user_id,endpoint' });
    });

    // Handle notification taps while app is in background/killed
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url as string | undefined;
      // Navigation handled by the app's router — just log for now
      console.log('Notification tapped, url:', url);
    });

    return () => sub.remove();
  }, [user]);
}
