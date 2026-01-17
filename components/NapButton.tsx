import FontAwesome from '@expo/vector-icons/FontAwesome';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import Colors from '@/constants/Colors';
import { Text } from './Themed';
import { useColorScheme } from './useColorScheme';

interface NapButtonProps {
  isActive: boolean;
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function NapButton({ isActive, onPress }: NapButtonProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.button,
        {
          backgroundColor: isActive ? colors.napActive : colors.napInactive,
          shadowColor: isActive ? colors.napActive : colors.napInactive,
        },
        animatedStyle,
      ]}
    >
      <FontAwesome
        name={isActive ? 'stop' : 'moon-o'}
        size={20}
        color="#FFFFFF"
      />
      <Text style={styles.buttonText}>
        {isActive ? 'Parar Soneca' : 'Iniciar Soneca'}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 30,
    marginHorizontal: 24,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    gap: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
