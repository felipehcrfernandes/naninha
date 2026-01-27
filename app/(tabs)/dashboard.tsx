import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';

import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
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
  notes: string | null;
}

// Colors for chart
const DAY_COLOR = '#F4A896'; // Coral - same as "Parar Soneca" button
const NIGHT_COLOR = '#7C9CBF'; // Blue - sleeping color

// Cache time for nap records (30 seconds)
const NAPS_CACHE_TIME = 30000;

export default function DashboardScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { user } = useAuth();
  const { babies, loading: loadingBabies } = useBabies();

  const [selectedBabyId, setSelectedBabyId] = useState<string | null>(null);
  const [napRecords, setNapRecords] = useState<NapRecord[]>([]);
  const [loadingNaps, setLoadingNaps] = useState(true);
  const [chartModalVisible, setChartModalVisible] = useState(false);
  
  // Aggregated stats
  const [totalDayMinutes, setTotalDayMinutes] = useState(0);
  const [totalNightMinutes, setTotalNightMinutes] = useState(0);
  const [daysWithData, setDaysWithData] = useState(0);
  
  // Monthly data for line chart (by baby age)
  const [monthlyData, setMonthlyData] = useState<{ ageLabel: string; dayAvg: number; nightAvg: number }[]>([]);
  
  // Cache tracking
  const lastFetchRef = useRef<{ babyId: string; time: number } | null>(null);

  // Select first baby if none selected
  const effectiveBabyId = selectedBabyId || babies[0]?.id || null;

  // Fetch ALL nap records for the baby
  const fetchNapRecords = useCallback(async (babyId: string, force: boolean = false) => {
    if (!user || !babyId) {
      setLoadingNaps(false);
      return;
    }

    // Check cache
    const now = Date.now();
    if (
      !force &&
      lastFetchRef.current?.babyId === babyId &&
      now - lastFetchRef.current.time < NAPS_CACHE_TIME
    ) {
      return;
    }

    // Only show loading if we don't have data or baby changed
    if (napRecords.length === 0 || lastFetchRef.current?.babyId !== babyId) {
      setLoadingNaps(true);
    }

    const { data, error } = await supabase
      .from('naps')
      .select('*')
      .eq('baby_id', babyId)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching nap records:', error);
      setLoadingNaps(false);
      return;
    }

    setNapRecords(data || []);
    lastFetchRef.current = { babyId, time: Date.now() };
    
    // Get selected baby's birth date
    const selectedBaby = babies.find(b => b.id === babyId);
    processData(data || [], selectedBaby?.birth_date || null);
    setLoadingNaps(false);
  }, [user, babies, napRecords.length]);

  // Helper to get local date key (YYYY-MM-DD) without timezone shift
  const getLocalDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Calculate baby's age in months at a given date
  const getAgeInMonths = (birthDate: Date, targetDate: Date): number => {
    const years = targetDate.getFullYear() - birthDate.getFullYear();
    const months = targetDate.getMonth() - birthDate.getMonth();
    return years * 12 + months;
  };

  // Process data to calculate totals and monthly averages by baby age
  const processData = (records: NapRecord[], birthDateStr: string | null) => {
    let dayMinutes = 0;
    let nightMinutes = 0;
    const uniqueDays = new Set<string>();
    
    // Monthly aggregation by baby age
    const monthlyMap = new Map<number, { dayMinutes: number; nightMinutes: number; days: Set<string> }>();
    
    const birthDate = birthDateStr ? new Date(birthDateStr) : null;

    records.forEach((record) => {
      const start = new Date(record.start_time);
      const end = new Date(record.end_time);
      const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
      const dateKey = getLocalDateKey(start);
      
      uniqueDays.add(dateKey);

      // Calculate age in months if birth date is available
      const ageMonth = birthDate ? getAgeInMonths(birthDate, start) : 0;

      // Initialize month if not exists
      if (!monthlyMap.has(ageMonth)) {
        monthlyMap.set(ageMonth, { dayMinutes: 0, nightMinutes: 0, days: new Set() });
      }
      const monthData = monthlyMap.get(ageMonth)!;
      monthData.days.add(dateKey);

      // Determine if daytime (6AM-6PM) or nighttime
      const startHour = start.getHours();
      if (startHour >= 6 && startHour < 18) {
        dayMinutes += durationMinutes;
        monthData.dayMinutes += durationMinutes;
      } else {
        nightMinutes += durationMinutes;
        monthData.nightMinutes += durationMinutes;
      }
    });

    setTotalDayMinutes(dayMinutes);
    setTotalNightMinutes(nightMinutes);
    setDaysWithData(uniqueDays.size || 1);

    // Convert monthly map to sorted array with averages
    const monthlyArray = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a - b)
      .slice(-12) // Last 12 months
      .map(([ageMonth, data]) => ({
        ageLabel: `${ageMonth}m`,
        dayAvg: (data.dayMinutes / 60) / (data.days.size || 1),
        nightAvg: (data.nightMinutes / 60) / (data.days.size || 1),
      }));

    setMonthlyData(monthlyArray);
  };

  // Handle baby selection change
  const handleBabySelect = useCallback((babyId: string) => {
    setSelectedBabyId(babyId);
    fetchNapRecords(babyId, true);
  }, [fetchNapRecords]);

  // Fetch naps on focus (with cache check)
  useFocusEffect(
    useCallback(() => {
      if (effectiveBabyId) {
        fetchNapRecords(effectiveBabyId);
      } else {
        setLoadingNaps(false);
      }
    }, [effectiveBabyId, fetchNapRecords])
  );

  const loading = loadingBabies || loadingNaps;

  // Calculate averages
  const totalMinutes = totalDayMinutes + totalNightMinutes;
  const avgHoursPerDay = (totalMinutes / 60) / daysWithData;
  const avgDayHours = (totalDayMinutes / 60) / daysWithData;
  const avgNightHours = (totalNightMinutes / 60) / daysWithData;

  // Donut chart data
  const getDonutData = () => {
    if (totalMinutes === 0) {
      return [
        {
          name: 'Sem dados',
          population: 1,
          color: colors.border,
          legendFontColor: colors.textSecondary,
          legendFontSize: 12,
        },
      ];
    }

    return [
      {
        name: 'Diurna',
        population: totalDayMinutes,
        color: DAY_COLOR,
        legendFontColor: colors.textSecondary,
        legendFontSize: 12,
      },
      {
        name: 'Noturna',
        population: totalNightMinutes,
        color: NIGHT_COLOR,
        legendFontColor: colors.textSecondary,
        legendFontSize: 12,
      },
    ];
  };

  // Chart configurations
  const chartConfig = {
    backgroundColor: colors.cardBackground,
    backgroundGradientFrom: colors.cardBackground,
    backgroundGradientTo: colors.cardBackground,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  };

  // Line chart configuration
  const lineChartConfig = {
    backgroundColor: colors.cardBackground,
    backgroundGradientFrom: colors.cardBackground,
    backgroundGradientTo: colors.cardBackground,
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(124, 156, 191, ${opacity})`,
    labelColor: () => colors.textSecondary,
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: colors.border,
    },
    propsForDots: {
      r: '4',
    },
  };

  // Line chart data with two datasets
  const getLineChartData = () => {
    if (monthlyData.length === 0) {
      return {
        labels: [''],
        datasets: [{ data: [0] }],
      };
    }

    return {
      labels: monthlyData.map(m => m.ageLabel),
      datasets: [
        {
          data: monthlyData.map(m => m.dayAvg),
          color: (opacity = 1) => `rgba(244, 168, 150, ${opacity})`, // DAY_COLOR
          strokeWidth: 2,
        },
        {
          data: monthlyData.map(m => m.nightAvg),
          color: (opacity = 1) => `rgba(124, 156, 191, ${opacity})`, // NIGHT_COLOR
          strokeWidth: 2,
        },
      ],
    };
  };

  // Empty state
  if (babies.length === 0 && !loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <FontAwesome name="pie-chart" size={64} color={colors.textSecondary} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Sem dados</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          Adicione um bebê para ver estatísticas de sono
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
                  backgroundColor: effectiveBabyId === baby.id ? colors.tint : colors.cardBackground,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => handleBabySelect(baby.id)}
            >
              <Text
                style={[
                  styles.babyChipText,
                  { color: effectiveBabyId === baby.id ? '#FFF' : colors.text },
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
          {/* Summary Stats */}
          <View style={[styles.statsRow, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {avgHoursPerDay.toFixed(1)}h
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary, textAlign: 'center' }]}>
                Média{'\n'}Diária
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {avgDayHours.toFixed(1)}h
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary, textAlign: 'center' }]}>
                Média{'\n'}Diurna
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {avgNightHours.toFixed(1)}h
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary, textAlign: 'center' }]}>
                Média{'\n'}Noturna
              </Text>
            </View>
          </View>

          {/* Donut Chart - Day vs Night */}
          <View style={[styles.chartCard, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>
              <FontAwesome name="pie-chart" size={16} color={colors.tint} /> Distribuição do Sono
            </Text>

            <PieChart
              data={getDonutData()}
              width={screenWidth - 48}
              height={180}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="60"
              center={[0, 0]}
              hasLegend={false}
              absolute={false}
            />

            {/* Percentage labels */}
            {totalMinutes > 0 && (
              <View style={styles.percentageRow}>
                <View style={styles.percentageItem}>
                  <View style={[styles.colorDot, { backgroundColor: DAY_COLOR }]} />
                  <Text style={[styles.percentageText, { color: colors.text }]}>
                    Diurna: {((totalDayMinutes / totalMinutes) * 100).toFixed(0)}%
                  </Text>
                </View>
                <View style={styles.percentageItem}>
                  <View style={[styles.colorDot, { backgroundColor: NIGHT_COLOR }]} />
                  <Text style={[styles.percentageText, { color: colors.text }]}>
                    Noturna: {((totalNightMinutes / totalMinutes) * 100).toFixed(0)}%
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Line Chart Button - Monthly Evolution by Age */}
          {monthlyData.length > 0 && (
            <TouchableOpacity
              style={[styles.chartButton, { backgroundColor: colors.cardBackground }]}
              onPress={() => setChartModalVisible(true)}
              activeOpacity={0.7}
            >
              <View style={styles.chartButtonContent}>
                <View style={styles.chartButtonLeft}>
                  <FontAwesome name="line-chart" size={24} color={colors.tint} />
                  <View>
                    <Text style={[styles.chartButtonTitle, { color: colors.text }]}>
                      Evolução por Idade
                    </Text>
                    <Text style={[styles.chartButtonSubtitle, { color: colors.textSecondary }]}>
                      Toque para visualizar
                    </Text>
                  </View>
                </View>
                <FontAwesome name="expand" size={20} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>
          )}

          {/* Line Chart Modal */}
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

              {/* Content */}
              {monthlyData.length > 1 ? (
                /* Rotated chart container */
                <View style={styles.rotatedChartWrapper}>
                  <View style={[styles.rotatedChartContainer, { transform: [{ rotate: '90deg' }] }]}>
                    <Text style={[styles.modalChartTitle, { color: colors.text }]}>
                      Evolução por Idade do Bebê
                    </Text>

                    <LineChart
                      data={getLineChartData()}
                      width={screenHeight - 80}
                      height={screenWidth - 140}
                      yAxisSuffix="h"
                      yAxisLabel=""
                      chartConfig={{
                        ...lineChartConfig,
                        backgroundColor: colors.background,
                        backgroundGradientFrom: colors.background,
                        backgroundGradientTo: colors.background,
                      }}
                      bezier
                      style={styles.modalChart}
                      fromZero
                    />

                    {/* Legend */}
                    <View style={styles.modalLegendContainer}>
                      <View style={styles.modalLegendItem}>
                        <View style={[styles.colorDot, { backgroundColor: DAY_COLOR }]} />
                        <Text style={[styles.modalLegendText, { color: colors.textSecondary }]}>
                          Média Diurna (6h-18h)
                        </Text>
                      </View>
                      <View style={styles.modalLegendItem}>
                        <View style={[styles.colorDot, { backgroundColor: NIGHT_COLOR }]} />
                        <Text style={[styles.modalLegendText, { color: colors.textSecondary }]}>
                          Média Noturna (18h-6h)
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ) : (
                /* Not enough data message */
                <View style={styles.notEnoughDataContainer}>
                  <FontAwesome name="line-chart" size={64} color={colors.textSecondary} />
                  <Text style={[styles.notEnoughDataTitle, { color: colors.text }]}>
                    Dados insuficientes
                  </Text>
                  <Text style={[styles.notEnoughDataText, { color: colors.textSecondary }]}>
                    Registre sonecas por mais de um mês para ver a evolução do sono do seu bebê ao longo do tempo.
                  </Text>
                </View>
              )}
            </View>
          </Modal>

          {/* Info text */}
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Baseado em {napRecords.length} sonecas registradas em {daysWithData} dias
          </Text>
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
  statsRow: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  chartCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
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
  modalLegendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 16,
  },
  modalLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalLegendText: {
    fontSize: 13,
  },
  modalInfoText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
  notEnoughDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  notEnoughDataTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 12,
  },
  notEnoughDataText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  percentageRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 8,
  },
  percentageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '500',
  },
  legendLabel: {
    fontSize: 12,
  },
  infoText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
});
