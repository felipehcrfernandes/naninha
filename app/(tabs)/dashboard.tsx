import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, TextInput } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
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
}

interface NapRecord {
  id: string;
  baby_id: string;
  start_time: string;
  end_time: string;
  notes: string | null;
}

interface DailyData {
  date: string;
  totalMinutes: number;
  dayMinutes: number;
  nightMinutes: number;
}

// Helper to format date as DD/MM/YYYY
const formatDateDisplay = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Helper to parse DD/MM/YYYY to Date
const parseDateInput = (input: string): Date | null => {
  const parts = input.split('/');
  if (parts.length !== 3) return null;
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  if (day < 1 || day > 31 || month < 0 || month > 11 || year < 2020) return null;
  
  return new Date(year, month, day);
};

// Format input with mask DD/MM/YYYY
const formatDateMask = (text: string): string => {
  const numbers = text.replace(/\D/g, '');
  let formatted = '';
  
  if (numbers.length > 0) {
    formatted = numbers.slice(0, 2);
  }
  if (numbers.length > 2) {
    formatted += '/' + numbers.slice(2, 4);
  }
  if (numbers.length > 4) {
    formatted += '/' + numbers.slice(4, 8);
  }
  
  return formatted;
};

// Colors for stacked chart
const DAY_COLOR = '#F4A896'; // Coral - same as "Parar Soneca" button
const NIGHT_COLOR = '#7C9CBF'; // Blue - sleeping color

export default function DashboardScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { user } = useAuth();

  // Default: last 7 days
  const getDefaultStartDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date;
  };

  const [babies, setBabies] = useState<Baby[]>([]);
  const [selectedBabyId, setSelectedBabyId] = useState<string | null>(null);
  const [napRecords, setNapRecords] = useState<NapRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);

  // Date filter state
  const [startDateInput, setStartDateInput] = useState(formatDateDisplay(getDefaultStartDate()));
  const [endDateInput, setEndDateInput] = useState(formatDateDisplay(new Date()));
  const [startDate, setStartDate] = useState<Date>(getDefaultStartDate());
  const [endDate, setEndDate] = useState<Date>(new Date());

  // Handle start date input change
  const handleStartDateChange = (text: string) => {
    const formatted = formatDateMask(text);
    setStartDateInput(formatted);
    
    if (formatted.length === 10) {
      const parsed = parseDateInput(formatted);
      if (parsed) {
        setStartDate(parsed);
      }
    }
  };

  // Handle end date input change
  const handleEndDateChange = (text: string) => {
    const formatted = formatDateMask(text);
    setEndDateInput(formatted);
    
    if (formatted.length === 10) {
      const parsed = parseDateInput(formatted);
      if (parsed) {
        setEndDate(parsed);
      }
    }
  };

  // Fetch babies
  const fetchBabies = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('baby_caregivers')
      .select('baby_id, babies(id, name)')
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

  // Fetch nap records
  const fetchNapRecords = useCallback(async () => {
    if (!user || !selectedBabyId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Set start of day for startDate and end of day for endDate
    const queryStartDate = new Date(startDate);
    queryStartDate.setHours(0, 0, 0, 0);
    
    const queryEndDate = new Date(endDate);
    queryEndDate.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('naps')
      .select('*')
      .eq('baby_id', selectedBabyId)
      .gte('start_time', queryStartDate.toISOString())
      .lte('start_time', queryEndDate.toISOString())
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching nap records:', error);
      setLoading(false);
      return;
    }

    setNapRecords(data || []);
    processData(data || [], queryStartDate, queryEndDate);
    setLoading(false);
  }, [user, selectedBabyId, startDate, endDate]);

  // Helper to get local date key (YYYY-MM-DD) without timezone shift
  const getLocalDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Process data for charts
  const processData = (records: NapRecord[], queryStartDate: Date, queryEndDate: Date) => {
    const dailyMap = new Map<string, DailyData>();

    // Initialize all days in range
    const currentDate = new Date(queryStartDate);
    while (currentDate <= queryEndDate) {
      const dateKey = getLocalDateKey(currentDate);
      dailyMap.set(dateKey, {
        date: dateKey,
        totalMinutes: 0,
        dayMinutes: 0,
        nightMinutes: 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Process each nap record
    records.forEach((record) => {
      const start = new Date(record.start_time);
      const end = new Date(record.end_time);
      const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
      const dateKey = getLocalDateKey(start);

      const existing = dailyMap.get(dateKey);
      if (existing) {
        existing.totalMinutes += durationMinutes;

        // Determine if daytime (6AM-6PM) or nighttime
        const startHour = start.getHours();
        if (startHour >= 6 && startHour < 18) {
          existing.dayMinutes += durationMinutes;
        } else {
          existing.nightMinutes += durationMinutes;
        }
      }
    });

    setDailyData(Array.from(dailyMap.values()));
  };

  useFocusEffect(
    useCallback(() => {
      fetchBabies();
    }, [fetchBabies])
  );

  useEffect(() => {
    fetchNapRecords();
  }, [fetchNapRecords]);

  // Chart configurations
  const chartConfig = {
    backgroundColor: colors.cardBackground,
    backgroundGradientFrom: colors.cardBackground,
    backgroundGradientTo: colors.cardBackground,
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(124, 156, 191, ${opacity})`, // NIGHT_COLOR
    labelColor: () => colors.textSecondary,
    style: {
      borderRadius: 16,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: colors.border,
    },
  };

  // Prepare line chart data
  const getLineChartData = () => {
    const labels = dailyData.map((d) => {
      const [, month, day] = d.date.split('-').map(Number);
      return `${day}/${month}`;
    });

    // Limit labels for readability
    const maxLabels = 7;
    const step = Math.ceil(labels.length / maxLabels);
    const filteredLabels = labels.map((label, i) => (i % step === 0 ? label : ''));

    const data = dailyData.map((d) => d.totalMinutes / 60);

    return {
      labels: filteredLabels,
      datasets: [{ data: data.length > 0 ? data : [0], strokeWidth: 2 }],
    };
  };

  // Calculate averages for display
  const totalHours = dailyData.reduce((sum, d) => sum + d.totalMinutes, 0) / 60;
  const totalDayHours = dailyData.reduce((sum, d) => sum + d.dayMinutes, 0) / 60;
  const totalNightHours = dailyData.reduce((sum, d) => sum + d.nightMinutes, 0) / 60;
  const daysWithData = dailyData.filter(d => d.totalMinutes > 0).length || 1;
  
  const avgHoursPerDay = totalHours / daysWithData;
  const avgDayHours = totalDayHours / daysWithData;
  const avgNightHours = totalNightHours / daysWithData;

  // Empty state
  if (babies.length === 0 && !loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <FontAwesome name="bar-chart" size={64} color={colors.textSecondary} />
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

      {/* Date Range Filter */}
      <View style={[styles.dateFilterContainer, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.dateInputGroup}>
          <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>De</Text>
          <TextInput
            style={[
              styles.dateInput,
              { 
                backgroundColor: colors.background,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            value={startDateInput}
            onChangeText={handleStartDateChange}
            placeholder="DD/MM/AAAA"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
            maxLength={10}
          />
        </View>
        <View style={styles.dateInputGroup}>
          <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Até</Text>
          <TextInput
            style={[
              styles.dateInput,
              { 
                backgroundColor: colors.background,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            value={endDateInput}
            onChangeText={handleEndDateChange}
            placeholder="DD/MM/AAAA"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
            maxLength={10}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <>
          {/* Summary Stats */}
          <View style={[styles.statsRow, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#FFFFFF' }]}>
                {avgHoursPerDay.toFixed(1)}h
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary, textAlign: 'center' }]}>
                Média{'\n'}Diária
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#FFFFFF' }]}>
                {avgDayHours.toFixed(1)}h
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary, textAlign: 'center' }]}>
                Média{'\n'}Diurna
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#FFFFFF' }]}>
                {avgNightHours.toFixed(1)}h
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary, textAlign: 'center' }]}>
                Média{'\n'}Noturna
              </Text>
            </View>
          </View>

          {/* Line Chart - Total sleep per day */}
          <View style={[styles.chartCard, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>
              <FontAwesome name="line-chart" size={16} color={colors.tint} /> Sono por dia (horas)
            </Text>

            {dailyData.length > 0 ? (
              <LineChart
                data={getLineChartData()}
                width={screenWidth - 48}
                height={220}
                yAxisSuffix="h"
                yAxisLabel=""
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                fromZero
              />
            ) : (
              <View style={styles.noDataContainer}>
                <Text style={[styles.noDataText, { color: colors.textSecondary }]}>
                  Sem registros no período
                </Text>
              </View>
            )}
          </View>
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
  dateFilterContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 12,
  },
  dateInputGroup: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  dateInput: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    textAlign: 'center',
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
    fontSize: 24,
    fontWeight: '700',
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
  chart: {
    borderRadius: 12,
    marginLeft: -16,
  },
  noDataContainer: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataText: {
    fontSize: 14,
  },
});
