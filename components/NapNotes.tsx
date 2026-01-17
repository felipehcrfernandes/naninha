import FontAwesome from '@expo/vector-icons/FontAwesome';
import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import Colors from '@/constants/Colors';
import { Text } from './Themed';
import { useColorScheme } from './useColorScheme';

interface NapNotesProps {
  value: string;
  onChangeText: (text: string) => void;
  isActive: boolean;
  onFocus?: () => void;
}

export default function NapNotes({ value, onChangeText, isActive, onFocus }: NapNotesProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <FontAwesome name="pencil" size={14} color={colors.textSecondary} />
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Anotações
        </Text>
      </View>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.cardBackground,
            borderColor: colors.border,
            color: colors.text,
            opacity: isActive ? 1 : 0.5,
          },
        ]}
        placeholder={
          isActive
            ? 'Como está a soneca? (ex: dormiu rápido, agitado...)'
            : 'Inicie a soneca para poder fazer registros...'
        }
        placeholderTextColor={colors.textSecondary}
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        editable={isActive}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 24,
    marginTop: 32,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    marginLeft: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    minHeight: 80,
    lineHeight: 22,
  },
});
