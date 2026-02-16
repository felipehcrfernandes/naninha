import * as AppleAuthentication from 'expo-apple-authentication';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { signIn, signInWithApple } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    setError(null);

    const { error } = await signInWithApple();

    if (error) {
      setError('Erro ao entrar com Apple. Tente novamente.');
    }
    setAppleLoading(false);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    setLoading(true);
    setError(null);

    const { error } = await signIn(email, password);

    if (error) {
      setError('Email ou senha incorretos');
      setLoading(false);
    }
    // If successful, AuthContext will update and root layout will redirect
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
          {/* Logo/Header */}
          <View style={styles.header}>
            <FontAwesome name="moon-o" size={64} color={colors.tint} />
            <Text style={[styles.title, { color: colors.text }]}>Naninha</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Acompanhe o sono do seu bebê
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Email
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: colors.cardBackground, borderColor: colors.border },
                ]}
              >
                <FontAwesome name="envelope-o" size={18} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="email"
                  placeholderTextColor={colors.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Senha
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: colors.cardBackground, borderColor: colors.border },
                ]}
              >
                <FontAwesome name="lock" size={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="senha"
                  placeholderTextColor={colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                />
                <Pressable onPress={() => setShowPassword(!showPassword)}>
                  <FontAwesome
                    name={showPassword ? 'eye' : 'eye-slash'}
                    size={18}
                    color={colors.textSecondary}
                  />
                </Pressable>
              </View>
            </View>

            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <FontAwesome name="exclamation-circle" size={16} color="#E74C3C" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Login Button */}
            <Pressable
              style={[
                styles.button,
                { backgroundColor: colors.tint, opacity: loading ? 0.7 : 1 },
              ]}
              onPress={handleLogin}
              disabled={loading || appleLoading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Entrar</Text>
              )}
            </Pressable>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textSecondary }]}>ou</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            {/* Apple Sign In */}
            {appleLoading ? (
              <View style={[styles.appleButtonContainer, { backgroundColor: colorScheme === 'dark' ? '#fff' : '#000' }]}>
                <ActivityIndicator color={colorScheme === 'dark' ? '#000' : '#fff'} />
              </View>
            ) : (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={
                  colorScheme === 'dark'
                    ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                    : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                }
                cornerRadius={12}
                style={styles.appleButton}
                onPress={handleAppleSignIn}
              />
            )}

            {/* Register Link */}
            <View style={styles.registerContainer}>
              <Text style={[styles.registerText, { color: colors.textSecondary }]}>
                Não tem uma conta?{' '}
              </Text>
              <Link href="/(auth)/register" asChild>
                <Pressable>
                  <Text style={[styles.registerLink, { color: colors.tint }]}>
                    Criar conta
                  </Text>
                </Pressable>
              </Link>
            </View>
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
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
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
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  errorText: {
    color: '#E74C3C',
    fontSize: 14,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    fontSize: 14,
  },
  appleButton: {
    height: 52,
    width: '100%',
  },
  appleButtonContainer: {
    height: 52,
    width: '100%',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  registerText: {
    fontSize: 14,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '600',
  },
});
