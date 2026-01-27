import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';

import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/contexts/AuthContext';
import { useBabies } from '@/contexts/BabiesContext';
import { supabase } from '@/lib/supabase';

const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

interface NapRecord {
  id: string;
  baby_id: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
}
// Chart color (orange/coral from palette)
const NAP_COLOR = '#F4A896';

// Cache time for naps (30 seconds)
const NAPS_CACHE_TIME = 30000;

export default function TodayScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { user } = useAuth();
  const { babies, loading: loadingBabies } = useBabies();

  const [selectedBabyId, setSelectedBabyId] = useState<string | null>(null);
  const [napRecords, setNapRecords] = useState<NapRecord[]>([]);
  const [loadingNaps, setLoadingNaps] = useState(true);
  const [chartModalVisible, setChartModalVisible] = useState(false);
  
  // Cache tracking for naps
  const lastNapsFetchRef = useRef<{ babyId: string; time: number } | null>(null);

  // Select first baby if none selected when babies load
  const effectiveBabyId = selectedBabyId || babies[0]?.id || null;

  // Fetch today's nap records for a specific baby
  const fetchTodayNaps = useCallback(async (babyId: string, force: boolean = false) => {
    if (!user || !babyId) return;

    // Check cache
    const now = Date.now();
    if (
      !force &&
      lastNapsFetchRef.current?.babyId === babyId &&
      now - lastNapsFetchRef.current.time < NAPS_CACHE_TIME
    ) {
      return;
    }

    // Only show loading if we don't have data yet
    if (napRecords.length === 0 || lastNapsFetchRef.current?.babyId !== babyId) {
      setLoadingNaps(true);
    }

    // Get today's date range (local timezone)
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const { data, error } = await supabase
      .from('naps')
      .select('id, baby_id, start_time, end_time, duration_seconds')
      .eq('baby_id', babyId)
      .gte('start_time', startOfDay.toISOString())
      .lte('start_time', endOfDay.toISOString())
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching nap records:', error);
    } else {
      setNapRecords(data || []);
      lastNapsFetchRef.current = { babyId, time: Date.now() };
    }

    setLoadingNaps(false);
  }, [user, napRecords.length]);

  // Fetch naps when baby selection changes
  const handleBabyChange = useCallback(async (babyId: string) => {
    setSelectedBabyId(babyId);
    await fetchTodayNaps(babyId, true);
  }, [fetchTodayNaps]);

  // Fetch naps on focus (with cache check)
  useFocusEffect(
    useCallback(() => {
      if (effectiveBabyId) {
        fetchTodayNaps(effectiveBabyId);
      } else {
        setLoadingNaps(false);
      }
    }, [effectiveBabyId, fetchTodayNaps])
  );

  const loading = loadingBabies || loadingNaps;

  // Memoized total nap hours for today
  const totalNapHours = useMemo(() => {
    const totalSeconds = napRecords.reduce((acc, nap) => acc + (nap.duration_seconds || 0), 0);
    return totalSeconds / 3600;
  }, [napRecords]);

  // Format hours for display (xhymin format)
  const formatHours = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h > 0 && m > 0) {
      return `${h}h${m}min`;
    } else if (h > 0) {
      return `${h}h0min`;
    } else {
      return `0h${m}min`;
    }
  };

  // Memoized chart data - only recalculates when napRecords change
  const chartData = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    
    const dataPoints: number[] = [];
    const INTERVAL_MINUTES = 10;
    const POINTS_COUNT = (24 * 60) / INTERVAL_MINUTES; // 144 points

    for (let i = 0; i <= POINTS_COUNT; i++) {
      const pointTime = new Date(startOfDay.getTime() + i * INTERVAL_MINUTES * 60 * 1000);
      let isSleeping = false;

      for (const nap of napRecords) {
        const napStart = new Date(nap.start_time);
        const napEnd = new Date(nap.end_time);

        if (pointTime >= napStart && pointTime < napEnd) {
          isSleeping = true;
          break;
        }
      }

      dataPoints.push(isSleeping ? 1 : 0);
    }

    return {
      labels: [], // Empty labels - we use custom x-axis
      datasets: [
        {
          data: dataPoints,
          color: (opacity = 1) => `rgba(244, 168, 150, ${opacity})`, // NAP_COLOR
          strokeWidth: 3,
        },
      ],
    };
  }, [napRecords]);

  // Custom x-axis labels
  const xAxisLabels = ['0h', '6h', '12h', '18h', '24h'];

  // Chart configuration
  const chartConfig = {
    backgroundColor: colors.cardBackground,
    backgroundGradientFrom: colors.cardBackground,
    backgroundGradientTo: colors.cardBackground,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(244, 168, 150, ${opacity})`, // NAP_COLOR
    labelColor: () => colors.textSecondary,
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: colors.border,
    },
    propsForDots: {
      r: '0', // Hide dots for cleaner step look
    },
    fillShadowGradientFrom: NAP_COLOR,
    fillShadowGradientFromOpacity: 0.3,
    fillShadowGradientTo: NAP_COLOR,
    fillShadowGradientToOpacity: 0.05,
  };

  // Empty state - no babies
  if (babies.length === 0 && !loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <FontAwesome name="calendar-o" size={64} color={colors.textSecondary} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Sem dados</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          Adicione um bebê para ver o resumo de hoje
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Baby Selector */}
      {babies.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.babySelector}
          contentContainerStyle={styles.babySelectorContent}
        >
          {babies.map((baby) => (
            <TouchableOpacity
              key={baby.id}
              style={[
                styles.babyChip,
                {
                  backgroundColor: selectedBabyId === baby.id ? colors.tint : colors.cardBackground,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => handleBabyChange(baby.id)}
            >
              <FontAwesome
                name={baby.gender === 'masculino' ? 'mars' : 'venus'}
                size={12}
                color={selectedBabyId === baby.id ? '#FFF' : baby.gender === 'masculino' ? '#1976D2' : '#C2185B'}
              />
              <Text
                style={[
                  styles.babyChipText,
                  { color: selectedBabyId === baby.id ? '#FFF' : colors.text },
                ]}
              >
                {baby.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <>
          {/* Total Nap Hours Card */}
          <View style={[styles.totalCard, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.totalCardHeader}>
              <FontAwesome name="moon-o" size={20} color={NAP_COLOR} />
              <Text style={[styles.totalCardTitle, { color: colors.text }]}>
                Tempo Total de Soneca
              </Text>
            </View>
            <Text style={[styles.totalCardValue, { color: colors.text }]}>
              {totalNapHours > 0 ? formatHours(totalNapHours) : '0min'}
            </Text>
            <Text style={[styles.totalCardSubtitle, { color: colors.textSecondary }]}>
              {napRecords.length === 0
                ? 'Nenhuma soneca registrada hoje'
                : napRecords.length === 1
                ? '1 soneca registrada'
                : `${napRecords.length} sonecas registradas`}
            </Text>
          </View>

          {/* Timeline Chart Button */}
          <TouchableOpacity
            style={[styles.chartButton, { backgroundColor: colors.cardBackground }]}
            onPress={() => setChartModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.chartButtonContent}>
              <View style={styles.chartButtonLeft}>
                <FontAwesome name="clock-o" size={24} color={colors.tint} />
                <View>
                  <Text style={[styles.chartButtonTitle, { color: colors.text }]}>
                    Linha do Tempo
                  </Text>
                  <Text style={[styles.chartButtonSubtitle, { color: colors.textSecondary }]}>
                    Toque para visualizar
                  </Text>
                </View>
              </View>
              <FontAwesome name="expand" size={20} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          {/* Timeline Chart Modal */}
          <Modal
            visible={chartModalVisible}
            animationType="fade"
            transparent={false}
            onRequestClose={() => setChartModalVisible(false)}
          >
            <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
              {/* Close button */}
              <Pressable
                style={[styles.closeButton, { backgroundColor: colors.cardBackground }]}
                onPress={() => setChartModalVisible(false)}
              >
                <FontAwesome name="times" size={20} color={colors.text} />
              </Pressable>

              {/* Rotated chart container */}
              <View style={styles.rotatedChartWrapper}>
                <View style={[styles.rotatedChartContainer, { transform: [{ rotate: '90deg' }] }]}>
                  <Text style={[styles.modalChartTitle, { color: colors.text }]}>
                    Linha do Tempo - Hoje
                  </Text>

                  <LineChart
                    data={chartData}
                    width={screenHeight - 80}
                    height={screenWidth - 140}
                    yAxisLabel=""
                    yAxisSuffix=""
                    chartConfig={{
                      ...chartConfig,
                      backgroundColor: colors.background,
                      backgroundGradientFrom: colors.background,
                      backgroundGradientTo: colors.background,
                    }}
                    style={styles.modalChart}
                    fromZero
                    withShadow
                    segments={1}
                    withVerticalLabels={false}
                    withHorizontalLabels={false}
                    formatYLabel={() => ''}
                    yAxisInterval={1}
                  />

                  {/* Custom X-Axis */}
                  <View style={[styles.customXAxis, { width: screenHeight - 80 }]}>
                    {xAxisLabels.map((label, index) => (
                      <Text 
                        key={label} 
                        style={[styles.xAxisLabel, { color: colors.textSecondary }]}
                      >
                        {label}
                      </Text>
                    ))}
                  </View>

                  {/* Legend */}
                  <View style={styles.legendContainer}>
                    <View style={[styles.legendDot, { backgroundColor: NAP_COLOR }]} />
                    <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                      Dormindo
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </Modal>

          {/* Nap List */}
          {napRecords.length > 0 && (
            <View style={[styles.napListCard, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                <FontAwesome name="list" size={16} color={colors.tint} /> Sonecas de Hoje
              </Text>

              {napRecords.map((nap, index) => {
                const start = new Date(nap.start_time);
                const end = new Date(nap.end_time);
                const startTime = start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const endTime = end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                return (
                  <View
                    key={nap.id}
                    style={[
                      styles.napItem,
                      index < napRecords.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                    ]}
                  >
                    <View style={styles.napTimeRange}>
                      <FontAwesome name="clock-o" size={14} color={NAP_COLOR} />
                      <Text style={[styles.napTimeText, { color: colors.text }]}>
                        {startTime} - {endTime}
                      </Text>
                    </View>
                    <Text style={[styles.napDuration, { color: colors.textSecondary }]}>
                      {formatHours(nap.duration_seconds / 3600)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  babySelector: {
    marginBottom: 16,
  },
  babySelectorContent: {
    gap: 8,
  },
  babyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  babyChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    padding: 48,
    alignItems: 'center',
  },
  totalCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  totalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  totalCardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalCardValue: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  totalCardSubtitle: {
    fontSize: 14,
  },
  chartButton: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  chartButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chartButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  chartButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  chartButtonSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  rotatedChartWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rotatedChartContainer: {
    alignItems: 'center',
  },
  modalChartTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalChart: {
    borderRadius: 12,
    marginLeft: -40,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  customXAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginTop: -5,
  },
  xAxisLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  legendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 13,
  },
  napListCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  napItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  napTimeRange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  napTimeText: {
    fontSize: 15,
    fontWeight: '500',
  },
  napDuration: {
    fontSize: 14,
  },
});
