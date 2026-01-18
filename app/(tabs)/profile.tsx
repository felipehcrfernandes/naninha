import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { supabase } from '@/lib/supabase';

interface Baby {
  id: string;
  name: string;
  birth_date: string | null;
  gender: 'masculino' | 'feminino';
}

export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { user, profile, signOut, updateProfile, deleteAccount } = useAuth();

  const [name, setName] = useState(profile?.name ?? '');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [babies, setBabies] = useState<Baby[]>([]);
  const [loadingBabies, setLoadingBabies] = useState(true);

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
    } catch (error) {
      console.error('Error fetching babies:', error);
    } finally {
      setLoadingBabies(false);
    }
  };

  const handleSaveName = async () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'O nome não pode estar vazio');
      return;
    }

    setSaving(true);
    const { error } = await updateProfile(name.trim());
    setSaving(false);

    if (error) {
      Alert.alert('Erro', 'Não foi possível atualizar o nome');
    } else {
      setIsEditing(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair da sua conta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            await signOut();
          },
        },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Deletar Conta',
      'Tem certeza que deseja deletar sua conta? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Deletar',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteAccount();
            if (error) {
              Alert.alert('Erro', 'Não foi possível deletar a conta');
            }
          },
        },
      ]
    );
  };

  const handleAddBaby = () => {
    router.push('/(tabs)/add-baby');
  };

  const calculateAge = (birthDate: string | null): string => {
    if (!birthDate) return '';
    
    const birth = new Date(birthDate);
    const now = new Date();
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + 
                   (now.getMonth() - birth.getMonth());
    
    if (months < 1) {
      const days = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
      return `${days} dias`;
    } else if (months < 12) {
      return `${months} ${months === 1 ? 'mês' : 'meses'}`;
    } else {
      const years = Math.floor(months / 12);
      const remainingMonths = months % 12;
      if (remainingMonths === 0) {
        return `${years} ${years === 1 ? 'ano' : 'anos'}`;
      }
      return `${years}a ${remainingMonths}m`;
    }
  };

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Profile Header */}
      <View style={styles.header}>
        <View
          style={[
            styles.avatarContainer,
            { backgroundColor: colors.cardBackground, borderColor: colors.border },
          ]}
        >
          <FontAwesome name="user" size={40} color={colors.tint} />
        </View>
        <Text style={[styles.userName, { color: colors.text }]}>
          {profile?.name ?? 'Usuário'}
        </Text>
        <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
          {user?.email}
        </Text>
      </View>

      {/* Name Section */}
      <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <FontAwesome name="pencil" size={16} color={colors.textSecondary} />
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Nome
          </Text>
        </View>

        {isEditing ? (
          <View style={styles.editContainer}>
            <TextInput
              style={[
                styles.nameInput,
                { color: colors.text, borderColor: colors.border },
              ]}
              value={name}
              onChangeText={setName}
              autoFocus
            />
            <View style={styles.editButtons}>
              <Pressable
                style={[styles.editButton, { backgroundColor: colors.border }]}
                onPress={() => {
                  setName(profile?.name ?? '');
                  setIsEditing(false);
                }}
              >
                <Text style={{ color: colors.text }}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.editButton, { backgroundColor: colors.tint }]}
                onPress={handleSaveName}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF' }}>Salvar</Text>
                )}
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            style={styles.nameDisplay}
            onPress={() => setIsEditing(true)}
          >
            <Text style={[styles.nameText, { color: colors.text }]}>
              {profile?.name ?? 'Toque para adicionar'}
            </Text>
            <FontAwesome name="chevron-right" size={14} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>

      {/* Baby Section */}
      <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <FontAwesome name="child" size={16} color={colors.textSecondary} />
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Bebês
          </Text>
        </View>

        {/* Baby List */}
        {loadingBabies ? (
          <ActivityIndicator size="small" color={colors.tint} style={{ marginVertical: 16 }} />
        ) : (
          <>
            {babies.map((baby) => (
              <View
                key={baby.id}
                style={[styles.babyItem, { borderColor: colors.border }]}
              >
                <View style={[styles.babyIcon, { backgroundColor: baby.gender === 'masculino' ? '#E3F2FD' : '#FCE4EC' }]}>
                  <FontAwesome
                    name={baby.gender === 'masculino' ? 'mars' : 'venus'}
                    size={16}
                    color={baby.gender === 'masculino' ? '#1976D2' : '#C2185B'}
                  />
                </View>
                <View style={styles.babyInfo}>
                  <Text style={[styles.babyName, { color: colors.text }]}>
                    {baby.name}
                  </Text>
                  {baby.birth_date && (
                    <Text style={[styles.babyAge, { color: colors.textSecondary }]}>
                      {calculateAge(baby.birth_date)}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </>
        )}

        <Pressable
          style={[styles.addBabyButton, { borderColor: colors.tint }]}
          onPress={handleAddBaby}
        >
          <FontAwesome name="plus" size={16} color={colors.tint} />
          <Text style={[styles.addBabyText, { color: colors.tint }]}>
            Adicionar Bebê
          </Text>
        </Pressable>
      </View>

      {/* Actions Section */}
      <View style={styles.actionsSection}>
        {/* Logout Button */}
        <Pressable
          style={[
            styles.actionButton,
            { backgroundColor: colors.cardBackground, borderColor: colors.border },
          ]}
          onPress={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <ActivityIndicator size="small" color={colors.tint} />
          ) : (
            <>
              <FontAwesome name="sign-out" size={18} color={colors.tint} />
              <Text style={[styles.actionButtonText, { color: colors.tint }]}>
                Sair
              </Text>
            </>
          )}
        </Pressable>

        {/* Delete Account Button */}
        <Pressable
          style={[
            styles.actionButton,
            styles.deleteButton,
            { backgroundColor: 'rgba(231, 76, 60, 0.1)', borderColor: '#E74C3C' },
          ]}
          onPress={handleDeleteAccount}
        >
          <FontAwesome name="trash-o" size={18} color="#E74C3C" />
          <Text style={[styles.actionButtonText, { color: '#E74C3C' }]}>
            Deletar Conta
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 48,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginBottom: 16,
  },
  userName: {
    fontSize: 22,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 14,
    marginTop: 4,
  },
  section: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  nameDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  nameText: {
    fontSize: 16,
  },
  editContainer: {
    gap: 12,
  },
  nameInput: {
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  editButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  babyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  babyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  babyInfo: {
    flex: 1,
  },
  babyName: {
    fontSize: 16,
    fontWeight: '500',
  },
  babyAge: {
    fontSize: 13,
    marginTop: 2,
  },
  addBabyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginTop: 12,
  },
  addBabyText: {
    fontSize: 15,
    fontWeight: '500',
  },
  actionsSection: {
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  deleteButton: {
    marginTop: 8,
  },
});
