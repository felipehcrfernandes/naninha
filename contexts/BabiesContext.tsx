import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export interface Baby {
  id: string;
  name: string;
  birth_date: string | null;
  gender: 'masculino' | 'feminino';
}

interface BabiesContextType {
  babies: Baby[];
  loading: boolean;
  error: Error | null;
  refreshBabies: () => Promise<void>;
  lastFetchedAt: number | null;
}

const BabiesContext = createContext<BabiesContextType | undefined>(undefined);

// Cache time in milliseconds (30 seconds)
const CACHE_TIME = 30000;

export function BabiesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [babies, setBabies] = useState<Baby[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  const fetchingRef = useRef(false);

  const fetchBabies = useCallback(async (force: boolean = false) => {
    if (!user?.id) {
      setBabies([]);
      setLoading(false);
      return;
    }

    // Skip if already fetching
    if (fetchingRef.current) return;

    // Skip if data is still fresh (unless forced)
    if (!force && lastFetchedAt && Date.now() - lastFetchedAt < CACHE_TIME) {
      return;
    }

    fetchingRef.current = true;
    
    // Only show loading if we don't have data yet
    if (babies.length === 0) {
      setLoading(true);
    }

    try {
      const { data, error: fetchError } = await supabase
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

      if (fetchError) throw fetchError;

      const babyList = data
        ?.map((item: any) => item.babies)
        .filter(Boolean) as Baby[];

      setBabies(babyList ?? []);
      setError(null);
      setLastFetchedAt(Date.now());
    } catch (err) {
      console.error('Error fetching babies:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [user?.id, lastFetchedAt, babies.length]);

  // Fetch babies when user changes
  useEffect(() => {
    if (user?.id) {
      fetchBabies(true);
    } else {
      setBabies([]);
      setLastFetchedAt(null);
      setLoading(false);
    }
  }, [user?.id]);

  // Force refresh function for manual refresh (e.g., after adding a baby)
  const refreshBabies = useCallback(async () => {
    await fetchBabies(true);
  }, [fetchBabies]);

  return (
    <BabiesContext.Provider
      value={{
        babies,
        loading,
        error,
        refreshBabies,
        lastFetchedAt,
      }}
    >
      {children}
    </BabiesContext.Provider>
  );
}

export function useBabies() {
  const context = useContext(BabiesContext);
  if (context === undefined) {
    throw new Error('useBabies must be used within a BabiesProvider');
  }
  return context;
}
