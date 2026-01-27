import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { dismissNapNotification, showNapNotification } from '@/lib/notifications';

const STORAGE_KEY = '@naninha/active_naps';

// How often to update the notification (in seconds)
const NOTIFICATION_UPDATE_INTERVAL = 30;

interface Baby {
  id: string;
  name: string;
  gender: 'masculino' | 'feminino';
}

interface ActiveNap {
  babyId: string;
  babyName: string;
  babyGender: 'masculino' | 'feminino';
  startTime: string; // ISO string for persistence
  notes: string;
}

interface NapContextType {
  activeNaps: Record<string, ActiveNap>;
  startNap: (baby: Baby) => void;
  stopNap: (babyId: string) => { startTime: Date; endTime: Date; elapsedSeconds: number; notes: string } | null;
  stopFirstActiveNap: () => { babyId: string; startTime: Date; endTime: Date; elapsedSeconds: number; notes: string } | null;
  updateNotes: (babyId: string, notes: string) => void;
  getElapsedSeconds: (babyId: string) => number;
  isNapping: (babyId: string) => boolean;
  hasAnyActiveNap: () => boolean;
  isLoading: boolean;
}

const NapContext = createContext<NapContextType | undefined>(undefined);

export function NapProvider({ children }: { children: React.ReactNode }) {
  const [activeNaps, setActiveNaps] = useState<Record<string, ActiveNap>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(0); // Used to force re-render for timer updates
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastNotificationUpdateRef = useRef<number>(0);

  // Load persisted naps on mount
  useEffect(() => {
    const loadPersistedNaps = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Record<string, ActiveNap>;
          setActiveNaps(parsed);
          console.log('Restored active naps:', Object.keys(parsed).length);
        }
      } catch (error) {
        console.error('Error loading persisted naps:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPersistedNaps();
  }, []);

  // Persist naps whenever they change
  useEffect(() => {
    if (isLoading) return; // Don't save during initial load

    const persistNaps = async () => {
      try {
        if (Object.keys(activeNaps).length > 0) {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(activeNaps));
        } else {
          await AsyncStorage.removeItem(STORAGE_KEY);
        }
      } catch (error) {
        console.error('Error persisting naps:', error);
      }
    };

    persistNaps();
  }, [activeNaps, isLoading]);

  // Update notification when active naps change
  useEffect(() => {
    const updateNotification = async () => {
      const napIds = Object.keys(activeNaps);
      
      if (napIds.length > 0) {
        // Get the first active nap to show in notification
        const firstNap = activeNaps[napIds[0]];
        const startTime = new Date(firstNap.startTime);
        const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
        
        await showNapNotification(firstNap.babyName, firstNap.babyGender, elapsed);
        lastNotificationUpdateRef.current = Date.now();
      } else {
        // No active naps, dismiss notification
        await dismissNapNotification();
      }
    };

    if (!isLoading) {
      updateNotification();
    }
  }, [activeNaps, isLoading]);

  // Start/stop tick interval based on whether there are active naps
  useEffect(() => {
    const napIds = Object.keys(activeNaps);
    
    if (napIds.length > 0) {
      // Start tick interval to update UI every second
      if (!tickIntervalRef.current) {
        tickIntervalRef.current = setInterval(() => {
          setTick((t) => t + 1);
          
          // Update notification every NOTIFICATION_UPDATE_INTERVAL seconds
          const now = Date.now();
          if (now - lastNotificationUpdateRef.current >= NOTIFICATION_UPDATE_INTERVAL * 1000) {
            const firstNap = activeNaps[napIds[0]];
            if (firstNap) {
              const startTime = new Date(firstNap.startTime);
              const elapsed = Math.floor((now - startTime.getTime()) / 1000);
              showNapNotification(firstNap.babyName, firstNap.babyGender, elapsed);
              lastNotificationUpdateRef.current = now;
            }
          }
        }, 1000);
      }
    } else {
      // Stop tick interval when no active naps
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
        tickIntervalRef.current = null;
      }
    }

    return () => {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
        tickIntervalRef.current = null;
      }
    };
  }, [Object.keys(activeNaps).length]);

  const startNap = useCallback((baby: Baby) => {
    const babyId = baby.id;

    // Don't start if already napping
    setActiveNaps((prev) => {
      if (prev[babyId]) return prev;

      return {
        ...prev,
        [babyId]: {
          babyId,
          babyName: baby.name,
          babyGender: baby.gender,
          startTime: new Date().toISOString(),
          notes: '',
        },
      };
    });
  }, []);

  const stopNap = useCallback((babyId: string) => {
    // Read from current state directly (not inside the updater)
    const nap = activeNaps[babyId];
    if (!nap) {
      console.warn('stopNap: No active nap found for babyId:', babyId);
      return null;
    }

    const startTime = new Date(nap.startTime);
    const endTime = new Date();
    const elapsedSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

    const result = {
      startTime,
      endTime,
      elapsedSeconds,
      notes: nap.notes,
    };

    // Remove from active naps
    setActiveNaps((prev) => {
      const newNaps = { ...prev };
      delete newNaps[babyId];
      return newNaps;
    });

    console.log('stopNap: Returning nap data', { babyId, elapsedSeconds });
    return result;
  }, [activeNaps]);

  // Stop the first active nap (used for notification action)
  const stopFirstActiveNap = useCallback(() => {
    const napIds = Object.keys(activeNaps);
    if (napIds.length === 0) {
      console.warn('stopFirstActiveNap: No active naps found');
      return null;
    }

    const babyId = napIds[0];
    const result = stopNap(babyId);
    
    if (result) {
      return { babyId, ...result };
    }
    return null;
  }, [activeNaps, stopNap]);

  const updateNotes = useCallback((babyId: string, notes: string) => {
    setActiveNaps((prev) => {
      if (!prev[babyId]) return prev;
      return {
        ...prev,
        [babyId]: {
          ...prev[babyId],
          notes,
        },
      };
    });
  }, []);

  // Calculate elapsed seconds dynamically from start time
  const getElapsedSeconds = useCallback((babyId: string) => {
    const nap = activeNaps[babyId];
    if (!nap) return 0;

    const startTime = new Date(nap.startTime);
    const now = new Date();
    return Math.floor((now.getTime() - startTime.getTime()) / 1000);
  }, [activeNaps, tick]); // Include tick to trigger recalculation

  const isNapping = useCallback((babyId: string) => {
    return !!activeNaps[babyId];
  }, [activeNaps]);

  const hasAnyActiveNap = useCallback(() => {
    return Object.keys(activeNaps).length > 0;
  }, [activeNaps]);

  return (
    <NapContext.Provider
      value={{
        activeNaps,
        startNap,
        stopNap,
        stopFirstActiveNap,
        updateNotes,
        getElapsedSeconds,
        isNapping,
        hasAnyActiveNap,
        isLoading,
      }}
    >
      {children}
    </NapContext.Provider>
  );
}

export function useNap() {
  const context = useContext(NapContext);
  if (context === undefined) {
    throw new Error('useNap must be used within a NapProvider');
  }
  return context;
}
