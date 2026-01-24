import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { PieChart, LineChart } from 'react-native-chart-kit';
import { useFocusEffect } from 'expo-router';

import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const screenWidth = Dimensions.get('window').width;

interface Baby {
  id: string;
  name: string;
  birth_date: string | null;
}

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

export default function DashboardScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { user } = useAuth();

  const [babies, setBabies] = useState<Baby[]>([]);
  const [selectedBabyId, setSelectedBabyId] = useState<string | null>(null);
  const [napRecords, setNapRecords] = useState<NapRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Aggregated stats
  const [totalDayMinutes, setTotalDayMinutes] = useState(0);
  const [totalNightMinutes, setTotalNightMinutes] = useState(0);
  const [daysWithData, setDaysWithData] = useState(0);
  
  // Monthly data for line chart (by baby age)
  const [monthlyData, setMonthlyData] = useState<{ ageLabel: string; dayAvg: number; nightAvg: number }[]>([]);

  // Fetch babies
  const fetchBabies = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('baby_caregivers')
      .select('baby_id, babies(id, name, birth_date)')
      .eq('profile_id', user.id)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching babies:', error);
      return;
    }

    const babyList = data
      ?.map((item: any) => item.babies)
      .filter(Boolean) as Baby[];

    setBabies(babyList || []);
    if (babyList && babyList.length > 0 && !selectedBabyId) {
      setSelectedBabyId(babyList[0].id);
    }
  }, [user, selectedBabyId]);

  // Fetch ALL nap records for the baby
  const fetchNapRecords = useCallback(async () => {
    if (!user || !selectedBabyId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from('naps')
      .select('*')
      .eq('baby_id', selectedBabyId)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching nap records:', error);
      setLoading(false);
      return;
    }

    setNapRecords(data || []);
    
    // Get selected baby's birth date
    const selectedBaby = babies.find(b => b.id === selectedBabyId);
    processData(data || [], selectedBaby?.birth_date || null);
    setLoading(false);
  }, [user, selectedBabyId, babies]);

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

  useFocusEffect(
    useCallback(() => {
      fetchBabies();
    }, [fetchBabies])
  );

  useEffect(() => {
    fetchNapRecords();
  }, [fetchNapRecords]);

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
                  backgroundColor: selectedBabyId === baby.id ? colors.tint : colors.cardBackground,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setSelectedBabyId(baby.id)}
            >
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

          {/* Line Chart - Monthly Evolution by Age */}
          {monthlyData.length > 1 && (
            <View style={[styles.chartCard, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.chartTitle, { color: colors.text }]}>
                <FontAwesome name="line-chart" size={16} color={colors.tint} /> Evolução por Idade
              </Text>

              <LineChart
                data={getLineChartData()}
                width={screenWidth - 48}
                height={200}
                yAxisSuffix="h"
                yAxisLabel=""
                chartConfig={lineChartConfig}
                bezier
                style={styles.lineChart}
                fromZero
                withLegend={false}
              />

              {/* Legend */}
              <View style={styles.percentageRow}>
                <View style={styles.percentageItem}>
                  <View style={[styles.colorDot, { backgroundColor: DAY_COLOR }]} />
                  <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>
                    Média Diurna
                  </Text>
                </View>
                <View style={styles.percentageItem}>
                  <View style={[styles.colorDot, { backgroundColor: NIGHT_COLOR }]} />
                  <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>
                    Média Noturna
                  </Text>
                </View>
              </View>
            </View>
          )}

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
  lineChart: {
    borderRadius: 12,
    marginLeft: -16,
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
