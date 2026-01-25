import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface Baby {
  id: string;
  name: string;
  gender: 'masculino' | 'feminino';
}

interface Nap {
  id: string;
  baby_id: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  notes: string | null;
  babies: Baby;
}

interface GroupedNaps {
  date: string;
  label: string;
  naps: Nap[];
}

export default function HistoryScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { user } = useAuth();

  const [naps, setNaps] = useState<Nap[]>([]);
  const [babies, setBabies] = useState<Baby[]>([]);
  const [selectedBabyId, setSelectedBabyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFilter, setShowFilter] = useState(false);

  // Fetch naps with optional baby filter
  const fetchNaps = useCallback(async (babyIdFilter?: string | null) => {
    if (!user?.id) return;

    setLoading(true);
    try {
      let query = supabase
        .from('naps')
        .select(`
          id,
          baby_id,
          start_time,
          end_time,
          duration_seconds,
          notes,
          babies (
            id,
            name,
            gender
          )
        `)
        .order('start_time', { ascending: false })
        .limit(100);

      // Filter by baby if selected
      if (babyIdFilter) {
        query = query.eq('baby_id', babyIdFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setNaps((data as unknown as Nap[]) ?? []);
    } catch (error) {
      console.error('Error fetching naps:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Combined fetch on focus
  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    // Fetch babies (lightweight, no loading state needed)
    try {
      const { data, error } = await supabase
        .from('baby_caregivers')
        .select('babies(id, name, gender)')
        .eq('profile_id', user.id)
        .eq('is_active', true);

      if (!error) {
        const babyList = data
          ?.map((item: any) => item.babies)
          .filter(Boolean) as Baby[];
        setBabies(babyList ?? []);
      }
    } catch (error) {
      console.error('Error fetching babies:', error);
    }

    // Fetch naps
    await fetchNaps(selectedBabyId);
  }, [user?.id, selectedBabyId, fetchNaps]);

  // Handle baby filter change
  const handleFilterChange = useCallback((babyId: string | null) => {
    setSelectedBabyId(babyId);
    setShowFilter(false);
    fetchNaps(babyId);
  }, [fetchNaps]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  // Memoized grouped naps by date
  const groupedNaps = useMemo((): GroupedNaps[] => {
    const groups: Record<string, Nap[]> = {};

    naps.forEach((nap) => {
      const date = new Date(nap.start_time).toLocaleDateString('pt-BR');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(nap);
    });

    return Object.entries(groups).map(([date, dateNaps]) => ({
      date,
      label: formatDateLabel(date),
      naps: dateNaps,
    }));
  }, [naps]);

  const formatDateLabel = (dateStr: string): string => {
    const [day, month, year] = dateStr.split('/');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoje';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    } else {
      return date.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
    }
  };

  const formatTime = (isoString: string): string => {
    return new Date(isoString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}min`;
  };

  const selectedBaby = babies.find((b) => b.id === selectedBabyId);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Filter Header */}
      <Pressable
        style={[styles.filterButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
        onPress={() => setShowFilter(!showFilter)}
      >
        <FontAwesome name="filter" size={14} color={colors.textSecondary} />
        <Text style={[styles.filterText, { color: colors.text }]}>
          {selectedBaby ? selectedBaby.name : 'Todos os bebês'}
        </Text>
        <FontAwesome
          name={showFilter ? 'chevron-up' : 'chevron-down'}
          size={12}
          color={colors.textSecondary}
        />
      </Pressable>

      {/* Filter Dropdown */}
      {showFilter && (
        <View style={[styles.filterDropdown, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Pressable
            style={[
              styles.filterOption,
              !selectedBabyId && { backgroundColor: colors.tint + '20' },
            ]}
            onPress={() => handleFilterChange(null)}
          >
            <Text style={[styles.filterOptionText, { color: colors.text }]}>
              Todos os bebês
            </Text>
            {!selectedBabyId && (
              <FontAwesome name="check" size={14} color={colors.tint} />
            )}
          </Pressable>

          {babies.map((baby) => (
            <Pressable
              key={baby.id}
              style={[
                styles.filterOption,
                selectedBabyId === baby.id && { backgroundColor: colors.tint + '20' },
              ]}
              onPress={() => handleFilterChange(baby.id)}
            >
              <View style={styles.filterBabyRow}>
                <FontAwesome
                  name={baby.gender === 'masculino' ? 'mars' : 'venus'}
                  size={14}
                  color={baby.gender === 'masculino' ? '#1976D2' : '#C2185B'}
                />
                <Text style={[styles.filterOptionText, { color: colors.text }]}>
                  {baby.name}
                </Text>
              </View>
              {selectedBabyId === baby.id && (
                <FontAwesome name="check" size={14} color={colors.tint} />
              )}
            </Pressable>
          ))}
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : naps.length === 0 ? (
        <View style={styles.centerContent}>
          <FontAwesome name="moon-o" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Nenhuma soneca registrada
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {selectedBaby
              ? `${selectedBaby.name} ainda não tem sonecas`
              : 'Inicie uma soneca para ver o histórico'}
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {groupedNaps.map((group) => (
            <View key={group.date} style={styles.dateGroup}>
              <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>
                {group.label}
              </Text>

              {group.naps.map((nap) => (
                <View
                  key={nap.id}
                  style={[styles.napCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                >
                  <View style={styles.napHeader}>
                    <View style={styles.napBabyInfo}>
                      <View
                        style={[
                          styles.babyIcon,
                          {
                            backgroundColor:
                              nap.babies.gender === 'masculino' ? '#E3F2FD' : '#FCE4EC',
                          },
                        ]}
                      >
                        <FontAwesome
                          name={nap.babies.gender === 'masculino' ? 'mars' : 'venus'}
                          size={12}
                          color={nap.babies.gender === 'masculino' ? '#1976D2' : '#C2185B'}
                        />
                      </View>
                      <Text style={[styles.napBabyName, { color: colors.text }]}>
                        {nap.babies.name}
                      </Text>
                    </View>
                    <Text style={[styles.napTime, { color: colors.textSecondary }]}>
                      {formatTime(nap.start_time)} - {formatTime(nap.end_time)}
                    </Text>
                  </View>

                  <View style={styles.napDetails}>
                    <View style={styles.napDuration}>
                      <FontAwesome name="clock-o" size={14} color={colors.tint} />
                      <Text style={[styles.napDurationText, { color: colors.text }]}>
                        {formatDuration(nap.duration_seconds)}
                      </Text>
                    </View>

                    {nap.notes && (
                      <Text style={[styles.napNotes, { color: colors.textSecondary }]}>
                        "{nap.notes}"
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  filterText: {
    flex: 1,
    fontSize: 15,
  },
  filterDropdown: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  filterBabyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterOptionText: {
    fontSize: 15,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 8,
  },
  dateGroup: {
    marginBottom: 20,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'capitalize',
  },
  napCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  napHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  napBabyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  babyIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  napBabyName: {
    fontSize: 15,
    fontWeight: '500',
  },
  napTime: {
    fontSize: 13,
  },
  napDetails: {
    gap: 8,
  },
  napDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  napDurationText: {
    fontSize: 14,
    fontWeight: '500',
  },
  napNotes: {
    fontSize: 13,
    fontStyle: 'italic',
  },
});
