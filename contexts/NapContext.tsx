import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

interface Baby {
  id: string;
  name: string;
  gender: 'masculino' | 'feminino';
}

interface ActiveNap {
  babyId: string;
  babyName: string;
  babyGender: 'masculino' | 'feminino';
  startTime: Date;
  elapsedSeconds: number;
  notes: string;
}

interface NapContextType {
  activeNaps: Record<string, ActiveNap>;
  startNap: (baby: Baby) => void;
  stopNap: (babyId: string) => { startTime: Date; endTime: Date; elapsedSeconds: number; notes: string } | null;
  updateNotes: (babyId: string, notes: string) => void;
  getElapsedSeconds: (babyId: string) => number;
  isNapping: (babyId: string) => boolean;
  hasAnyActiveNap: () => boolean;
}

const NapContext = createContext<NapContextType | undefined>(undefined);

export function NapProvider({ children }: { children: React.ReactNode }) {
  const [activeNaps, setActiveNaps] = useState<Record<string, ActiveNap>>({});
  const intervalsRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      Object.values(intervalsRef.current).forEach((intervalId) => {
        clearInterval(intervalId);
      });
    };
  }, []);

  const startNap = useCallback((baby: Baby) => {
    const babyId = baby.id;

    // Don't start if already napping
    if (activeNaps[babyId]) return;

    // Start interval to update elapsed seconds
    const intervalId = setInterval(() => {
      setActiveNaps((prev) => {
        if (!prev[babyId]) return prev;
        return {
          ...prev,
          [babyId]: {
            ...prev[babyId],
            elapsedSeconds: prev[babyId].elapsedSeconds + 1,
          },
        };
      });
    }, 1000);

    intervalsRef.current[babyId] = intervalId;

    setActiveNaps((prev) => ({
      ...prev,
      [babyId]: {
        babyId,
        babyName: baby.name,
        babyGender: baby.gender,
        startTime: new Date(),
        elapsedSeconds: 0,
        notes: '',
      },
    }));
  }, [activeNaps]);

  const stopNap = useCallback((babyId: string) => {
    const nap = activeNaps[babyId];
    if (!nap) return null;

    // Clear interval
    if (intervalsRef.current[babyId]) {
      clearInterval(intervalsRef.current[babyId]);
      delete intervalsRef.current[babyId];
    }

    const result = {
      startTime: nap.startTime,
      endTime: new Date(),
      elapsedSeconds: nap.elapsedSeconds,
      notes: nap.notes,
    };

    // Remove from active naps
    setActiveNaps((prev) => {
      const newNaps = { ...prev };
      delete newNaps[babyId];
      return newNaps;
    });

    return result;
  }, [activeNaps]);

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

  const getElapsedSeconds = useCallback((babyId: string) => {
    return activeNaps[babyId]?.elapsedSeconds ?? 0;
  }, [activeNaps]);

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
        updateNotes,
        getElapsedSeconds,
        isNapping,
        hasAnyActiveNap,
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
