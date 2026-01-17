import React, { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

import NapButton from '@/components/NapButton';
import NapNotes from '@/components/NapNotes';
import NapTimer from '@/components/NapTimer';
import { View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

export default function NapTrackerScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  // Nap state
  const [isNapping, setIsNapping] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [notes, setNotes] = useState('');

  // Refs
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Scroll to bottom when input is focused
  const handleNotesFocus = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  // Start/Stop nap handler
  const toggleNap = useCallback(() => {
    if (isNapping) {
      // Stop the nap
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsNapping(false);
      // Future: Save nap record to database here
      console.log('Nap ended:', {
        duration: elapsedSeconds,
        notes,
        startTime: startTimeRef.current,
        endTime: new Date(),
      });
      // Reset timer to 00:00
      setElapsedSeconds(0);
      setNotes('');
    } else {
      // Start a new nap
      startTimeRef.current = new Date();
      setIsNapping(true);

      intervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
  }, [isNapping, elapsedSeconds, notes]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        ref={scrollViewRef}
        style={[styles.scrollView, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {/* Timer Display */}
          <NapTimer elapsedSeconds={elapsedSeconds} isActive={isNapping} />

          {/* Start/Stop Button */}
          <NapButton isActive={isNapping} onPress={toggleNap} />

          {/* Notes Input */}
          <NapNotes
            value={notes}
            onChangeText={setNotes}
            isActive={isNapping}
            onFocus={handleNotesFocus}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    paddingTop: 20,
    paddingBottom: 40,
  },
});
