import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';

import Colors from '@/constants/Colors';
import { FontAwesome } from '@expo/vector-icons';
import { Text } from './Themed';
import { useColorScheme } from './useColorScheme';

interface NapTimerProps {
  elapsedSeconds: number;
  isActive: boolean;
}

function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

export default function NapTimer({ elapsedSeconds, isActive }: NapTimerProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  // Gentle pulsing animation when nap is active
  const pulseStyle = useAnimatedStyle(() => {
    if (!isActive) {
      return { transform: [{ scale: 1 }], opacity: 1 };
    }

    return {
      transform: [
        {
          scale: withRepeat(
            withSequence(
              withTiming(1.02, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
              withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
          ),
        },
      ],
      opacity: 1,
    };
  }, [isActive]);

  const glowStyle = useAnimatedStyle(() => {
    if (!isActive) {
      return { opacity: 0 };
    }

    return {
      opacity: withRepeat(
        withSequence(
          withTiming(0.6, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      ),
    };
  }, [isActive]);

  return (
    <View style={styles.container}>
      {/* Outer glow ring when active */}
      <Animated.View
        style={[
          styles.glowRing,
          { backgroundColor: colors.sleeping },
          glowStyle,
        ]}
      />

      {/* Main timer circle */}
      <Animated.View
        style={[
          styles.timerCircle,
          {
            backgroundColor: isActive ? colors.sleeping : colors.cardBackground,
            borderColor: isActive ? colors.sleeping : colors.border,
          },
          pulseStyle,
        ]}
      >
        {/* Status indicator */}
        <View style={styles.statusRow}>
          <FontAwesome
            name={isActive ? 'moon-o' : 'sun-o'}
            size={16}
            color={isActive ? colors.cardBackground : colors.textSecondary}
          />
          <Text
            style={[
              styles.statusText,
              { color: isActive ? colors.cardBackground : colors.textSecondary },
            ]}
          >
            {isActive ? 'Dormindo...' : 'Acordado'}
          </Text>
        </View>

        {/* Timer display */}
        <Text
          style={[
            styles.timerText,
            { color: isActive ? colors.cardBackground : colors.text },
          ]}
        >
          {formatTime(elapsedSeconds)}
        </Text>

        {/* Subtle label */}
        <Text
          style={[
            styles.labelText,
            { color: isActive ? colors.cardBackground : colors.textSecondary },
          ]}
        >
          {isActive ? 'tempo de soneca' : 'pronto para dormir'}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 40,
  },
  glowRing: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
  },
  timerCircle: {
    width: 240,
    height: 240,
    borderRadius: 120,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
  },
  timerText: {
    fontSize: 48,
    fontWeight: '300',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  labelText: {
    fontSize: 12,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
