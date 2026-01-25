import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useNap } from '@/contexts/NapContext';

const SLEEP_COLOR = '#7C9CBF';

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function NapBannerItem({ 
  babyName, 
  babyGender, 
  elapsedSeconds 
}: { 
  babyName: string; 
  babyGender: 'masculino' | 'feminino';
  elapsedSeconds: number;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  // Pulse animation
  const opacity = useSharedValue(1);
  
  React.useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.6, { duration: 1000 }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Pressable
      style={[styles.bannerItem, { backgroundColor: SLEEP_COLOR }]}
      onPress={() => router.navigate('/(tabs)')}
    >
      <View style={styles.bannerContent}>
        <Animated.View style={[styles.pulseIndicator, animatedStyle]}>
          <FontAwesome name="moon-o" size={14} color="#FFF" />
        </Animated.View>
        
        <View style={styles.bannerTextContainer}>
          <View style={styles.babyInfo}>
            <FontAwesome
              name={babyGender === 'masculino' ? 'mars' : 'venus'}
              size={12}
              color="#FFF"
            />
            <Text style={styles.babyName}>{babyName}</Text>
          </View>
          <Text style={styles.timerText}>{formatTime(elapsedSeconds)}</Text>
        </View>

        <FontAwesome name="chevron-right" size={12} color="rgba(255,255,255,0.7)" />
      </View>
    </Pressable>
  );
}

export default function ActiveNapBanner() {
  const { activeNaps, hasAnyActiveNap } = useNap();

  if (!hasAnyActiveNap()) {
    return null;
  }

  const naps = Object.values(activeNaps);

  return (
    <View style={styles.container}>
      {naps.map((nap) => (
        <NapBannerItem
          key={nap.babyId}
          babyName={nap.babyName}
          babyGender={nap.babyGender}
          elapsedSeconds={nap.elapsedSeconds}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  bannerItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pulseIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTextContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  babyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  babyName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  timerText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
