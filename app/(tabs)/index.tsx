import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet
} from 'react-native';
import PagerView from 'react-native-pager-view';

import NapButton from '@/components/NapButton';
import NapNotes from '@/components/NapNotes';
import NapTimer from '@/components/NapTimer';
import PageDots from '@/components/PageDots';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface Baby {
  id: string;
  name: string;
  birth_date: string | null;
  gender: 'masculino' | 'feminino';
}

interface BabyNapState {
  isNapping: boolean;
  elapsedSeconds: number;
  notes: string;
  startTime: Date | null;
  intervalId: ReturnType<typeof setInterval> | null;
}

export default function NapTrackerScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { user } = useAuth();

  // Babies state
  const [babies, setBabies] = useState<Baby[]>([]);
  const [loadingBabies, setLoadingBabies] = useState(true);
  const [currentBabyIndex, setCurrentBabyIndex] = useState(0);

  // Nap states for each baby (keyed by baby id)
  const [napStates, setNapStates] = useState<Record<string, BabyNapState>>({});

  const scrollViewRef = useRef<ScrollView>(null);
  const pagerRef = useRef<PagerView>(null);

  // Fetch babies when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchBabies();
    }, [user?.id])
  );

  const fetchBabies = async () => {
    if (!user?.id) return;

    setLoadingBabies(true);
    try {
      const { data, error } = await supabase
        .from('baby_caregivers')
        .select(`
          baby_id,
          babies (
            id,
            name,
            birth_date,
            gender
          )
        `)
        .eq('profile_id', user.id)
        .eq('is_active', true);

      if (error) throw error;

      const babyList = data
        ?.map((item: any) => item.babies)
        .filter(Boolean) as Baby[];

      setBabies(babyList ?? []);

      // Initialize nap states for new babies
      const newNapStates: Record<string, BabyNapState> = { ...napStates };
      babyList?.forEach((baby) => {
        if (!newNapStates[baby.id]) {
          newNapStates[baby.id] = {
            isNapping: false,
            elapsedSeconds: 0,
            notes: '',
            startTime: null,
            intervalId: null,
          };
        }
      });
      setNapStates(newNapStates);
    } catch (error) {
      console.error('Error fetching babies:', error);
    } finally {
      setLoadingBabies(false);
    }
  };

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      Object.values(napStates).forEach((state) => {
        if (state.intervalId) {
          clearInterval(state.intervalId);
        }
      });
    };
  }, []);

  // Save nap to database
  const saveNap = async ({
    babyId,
    startTime,
    endTime,
    durationSeconds,
    notes,
  }: {
    babyId: string;
    startTime: Date;
    endTime: Date;
    durationSeconds: number;
    notes: string | null;
  }) => {
    try {
      const { error } = await supabase.from('naps').insert({
        baby_id: babyId,
        started_by: user?.id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_seconds: durationSeconds,
        notes,
      });

      if (error) {
        console.error('Error saving nap:', error);
      } else {
        console.log('Nap saved successfully');
      }
    } catch (error) {
      console.error('Error saving nap:', error);
    }
  };

  // Get current baby and its nap state
  const currentBaby = babies[currentBabyIndex];
  const currentNapState = currentBaby ? napStates[currentBaby.id] : null;

  // Toggle nap for current baby
  const toggleNap = useCallback(() => {
    if (!currentBaby) return;

    const babyId = currentBaby.id;
    const state = napStates[babyId];

    if (state?.isNapping) {
      // Stop the nap
      if (state.intervalId) {
        clearInterval(state.intervalId);
      }

      const endTime = new Date();
      const startTime = state.startTime;

      // Save nap to database
      if (startTime && state.elapsedSeconds > 0) {
        saveNap({
          babyId,
          startTime,
          endTime,
          durationSeconds: state.elapsedSeconds,
          notes: state.notes || null,
        });
      }

      setNapStates((prev) => ({
        ...prev,
        [babyId]: {
          ...prev[babyId],
          isNapping: false,
          elapsedSeconds: 0,
          notes: '',
          startTime: null,
          intervalId: null,
        },
      }));
    } else {
      // Start a new nap
      const intervalId = setInterval(() => {
        setNapStates((prev) => ({
          ...prev,
          [babyId]: {
            ...prev[babyId],
            elapsedSeconds: (prev[babyId]?.elapsedSeconds ?? 0) + 1,
          },
        }));
      }, 1000);

      setNapStates((prev) => ({
        ...prev,
        [babyId]: {
          ...prev[babyId],
          isNapping: true,
          startTime: new Date(),
          intervalId,
        },
      }));
    }
  }, [currentBaby, napStates]);

  // Update notes for current baby
  const updateNotes = useCallback(
    (text: string) => {
      if (!currentBaby) return;
      setNapStates((prev) => ({
        ...prev,
        [currentBaby.id]: {
          ...prev[currentBaby.id],
          notes: text,
        },
      }));
    },
    [currentBaby]
  );

  // Handle page change
  const onPageSelected = (e: any) => {
    setCurrentBabyIndex(e.nativeEvent.position);
  };

  // Scroll to bottom when notes focused
  const handleNotesFocus = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  // Loading state
  if (loadingBabies) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  // No babies state
  if (babies.length === 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <FontAwesome name="child" size={64} color={colors.textSecondary} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          Nenhum bebê cadastrado
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          Adicione um bebê para começar o monitoramento
        </Text>
        <Pressable
          style={[styles.addButton, { backgroundColor: colors.tint }]}
          onPress={() => router.push('/(tabs)/add-baby')}
        >
          <FontAwesome name="plus" size={16} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Adicionar Bebê</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
        {/* Baby Name Header */}
        <View style={[styles.babyHeader, { backgroundColor: colors.background }]}>
          <FontAwesome
            name={currentBaby?.gender === 'masculino' ? 'mars' : 'venus'}
            size={16}
            color={currentBaby?.gender === 'masculino' ? '#1976D2' : '#C2185B'}
          />
          <Text style={[styles.babyName, { color: colors.text }]}>
            {currentBaby?.name}
          </Text>
        </View>

        {/* Pager for multiple babies */}
        <PagerView
          ref={pagerRef}
          style={styles.pager}
          initialPage={0}
          onPageSelected={onPageSelected}
        >
          {babies.map((baby, index) => (
            <ScrollView
              key={baby.id}
              ref={index === currentBabyIndex ? scrollViewRef : undefined}
              contentContainerStyle={styles.pageContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={[styles.timerContainer, { backgroundColor: colors.background }]}>
                {/* Timer Display */}
                <NapTimer
                  elapsedSeconds={napStates[baby.id]?.elapsedSeconds ?? 0}
                  isActive={napStates[baby.id]?.isNapping ?? false}
                />

                {/* Start/Stop Button */}
                <NapButton
                  isActive={napStates[baby.id]?.isNapping ?? false}
                  onPress={index === currentBabyIndex ? toggleNap : () => {}}
                />

                {/* Notes Input */}
                <NapNotes
                  value={napStates[baby.id]?.notes ?? ''}
                  onChangeText={index === currentBabyIndex ? updateNotes : () => {}}
                  isActive={napStates[baby.id]?.isNapping ?? false}
                  onFocus={handleNotesFocus}
                />
              </View>
            </ScrollView>
          ))}
        </PagerView>

        {/* Page Dots */}
        <PageDots total={babies.length} current={currentBabyIndex} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  mainContainer: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  babyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  babyName: {
    fontSize: 18,
    fontWeight: '600',
  },
  pager: {
    flex: 1,
  },
  pageContent: {
    flexGrow: 1,
  },
  timerContainer: {
    flex: 1,
    paddingTop: 10,
    paddingBottom: 20,
  },
});
