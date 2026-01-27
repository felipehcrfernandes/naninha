import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/contexts/AuthContext';
import { useBabies } from '@/contexts/BabiesContext';
import { supabase } from '@/lib/supabase';

export default function AddBabyScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { user } = useAuth();
  const { refreshBabies } = useBabies();

  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'masculino' | 'feminino' | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-format date as user types (DD/MM/YYYY)
  const handleDateChange = (text: string) => {
    // Remove non-numeric characters
    const numbers = text.replace(/\D/g, '');
    
    // Apply mask
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
    
    setBirthDate(formatted);
  };

  const parseDateForDB = (dateStr: string): string | null => {
    if (!dateStr || dateStr.length !== 10) return null;
    
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    
    const [day, month, year] = parts;
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    
    // Basic validation
    if (dayNum < 1 || dayNum > 31) return null;
    if (monthNum < 1 || monthNum > 12) return null;
    if (yearNum < 1900 || yearNum > new Date().getFullYear()) return null;
    
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert('Erro', 'Por favor, informe o nome do bebê');
      return;
    }

    if (!gender) {
      Alert.alert('Erro', 'Por favor, selecione o gênero');
      return;
    }

    // Validate date if provided
    let parsedDate: string | null = null;
    if (birthDate.trim()) {
      parsedDate = parseDateForDB(birthDate);
      if (birthDate.length > 0 && !parsedDate) {
        Alert.alert('Erro', 'Data de nascimento inválida. Use o formato DD/MM/AAAA');
        return;
      }
    }

    setLoading(true);

    try {
      // Create baby
      const { data: baby, error: babyError } = await supabase
        .from('babies')
        .insert({
          name: name.trim(),
          birth_date: parsedDate,
          gender,
          created_by: user?.id,
        })
        .select()
        .single();

      if (babyError) {
        throw babyError;
      }

      // Add creator as caregiver
      const { error: caregiverError } = await supabase
        .from('baby_caregivers')
        .insert({
          baby_id: baby.id,
          profile_id: user?.id,
          role: 'responsável',
        });

      if (caregiverError) {
        throw caregiverError;
      }

      // Refresh the babies list in context
      await refreshBabies();

      Alert.alert(
        'Sucesso',
        `${name} foi adicionado com sucesso!`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error creating baby:', error);
      Alert.alert('Erro', 'Não foi possível adicionar o bebê. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={[styles.scrollView, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <FontAwesome name="child" size={48} color={colors.tint} />
            <Text style={[styles.title, { color: colors.text }]}>
              Adicionar Bebê
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Preencha as informações do bebê
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Name Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Nome *
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: colors.cardBackground, borderColor: colors.border },
                ]}
              >
                <FontAwesome name="heart" size={16} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Nome do bebê"
                  placeholderTextColor={colors.textSecondary}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Birth Date Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Data de Nascimento
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: colors.cardBackground, borderColor: colors.border },
                ]}
              >
                <FontAwesome name="calendar" size={16} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor={colors.textSecondary}
                  value={birthDate}
                  onChangeText={handleDateChange}
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>
            </View>

            {/* Gender Selection */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Gênero *
              </Text>
              <View style={styles.genderContainer}>
                <Pressable
                  style={[
                    styles.genderButton,
                    {
                      backgroundColor: gender === 'masculino' ? colors.tint : colors.cardBackground,
                      borderColor: gender === 'masculino' ? colors.tint : colors.border,
                    },
                  ]}
                  onPress={() => setGender('masculino')}
                >
                  <FontAwesome
                    name="mars"
                    size={20}
                    color={gender === 'masculino' ? '#FFFFFF' : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.genderText,
                      { color: gender === 'masculino' ? '#FFFFFF' : colors.text },
                    ]}
                  >
                    Masculino
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.genderButton,
                    {
                      backgroundColor: gender === 'feminino' ? '#F4A896' : colors.cardBackground,
                      borderColor: gender === 'feminino' ? '#F4A896' : colors.border,
                    },
                  ]}
                  onPress={() => setGender('feminino')}
                >
                  <FontAwesome
                    name="venus"
                    size={20}
                    color={gender === 'feminino' ? '#FFFFFF' : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.genderText,
                      { color: gender === 'feminino' ? '#FFFFFF' : colors.text },
                    ]}
                  >
                    Feminino
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Save Button */}
            <Pressable
              style={[
                styles.saveButton,
                { backgroundColor: colors.tint, opacity: loading ? 0.7 : 1 },
              ]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <FontAwesome name="check" size={18} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Salvar</Text>
                </>
              )}
            </Pressable>

            {/* Cancel Button */}
            <Pressable
              style={[
                styles.cancelButton,
                { borderColor: colors.border },
              ]}
              onPress={() => router.back()}
              disabled={loading}
            >
              <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                Cancelar
              </Text>
            </Pressable>
          </View>
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
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 15,
    marginTop: 8,
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  genderText: {
    fontSize: 15,
    fontWeight: '500',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 15,
  },
});
