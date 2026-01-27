import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { BabiesProvider } from '@/contexts/BabiesContext';
import { NapProvider, useNap } from '@/contexts/NapContext';
import {
  addNotificationResponseListener,
  initializeNotifications,
  isStopNapAction,
  STOP_NAP_ACTION,
} from '@/lib/notifications';
import { supabase } from '@/lib/supabase';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(auth)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <BabiesProvider>
        <NapProvider>
          <NotificationHandler />
          <RootLayoutNav />
        </NapProvider>
      </BabiesProvider>
    </AuthProvider>
  );
}

// Component to handle notification initialization and actions
function NotificationHandler() {
  const { stopFirstActiveNap } = useNap();
  const { user } = useAuth();
  const stopFirstActiveNapRef = useRef(stopFirstActiveNap);

  // Keep ref updated
  useEffect(() => {
    stopFirstActiveNapRef.current = stopFirstActiveNap;
  }, [stopFirstActiveNap]);

  // Initialize notifications on mount
  useEffect(() => {
    initializeNotifications();
  }, []);

  // Save nap to database helper
  const saveNapToDatabase = async (napData: {
    babyId: string;
    startTime: Date;
    endTime: Date;
    elapsedSeconds: number;
    notes: string;
  }) => {
    if (!user?.id || napData.elapsedSeconds <= 0) return;

    try {
      const { error } = await supabase.from('naps').insert({
        baby_id: napData.babyId,
        started_by: user.id,
        start_time: napData.startTime.toISOString(),
        end_time: napData.endTime.toISOString(),
        duration_seconds: napData.elapsedSeconds,
        notes: napData.notes || null,
      });

      if (error) {
        console.error('Error saving nap from notification:', error);
      } else {
        console.log('Nap saved from notification action');
      }
    } catch (error) {
      console.error('Error saving nap from notification:', error);
    }
  };

  // Listen for notification actions
  useEffect(() => {
    const subscription = addNotificationResponseListener((response) => {
      // Check if user tapped the "Stop Nap" action or the notification itself
      if (isStopNapAction(response) || response.actionIdentifier === 'expo.modules.notifications.actions.DEFAULT') {
        const napData = stopFirstActiveNapRef.current();
        if (napData) {
          saveNapToDatabase(napData);
        }
      }
    });

    return () => subscription.remove();
  }, [user?.id]);

  return null;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      // Redirect to tabs if authenticated
      router.replace('/(tabs)');
    }
  }, [session, loading, segments]);

  // Show loading screen while checking auth
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </ThemeProvider>
  );
}
