import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useSubscription } from '@/contexts/SubscriptionContext';

interface PaywallProps {
  onLogout?: () => void;
}

export function Paywall({ onLogout }: PaywallProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const {
    status,
    products,
    isPurchasing,
    purchaseSubscription,
    restorePurchases,
    trialDaysRemaining,
  } = useSubscription();

  // Get product price from App Store
  const product = products[0];
  const priceString = product?.localizedPrice || 'R$ 9,90/mês';

  const features = [
    {
      icon: 'moon-outline' as const,
      title: 'Registro de Sonecas',
      description: 'Acompanhe todas as sonecas do seu bebê',
    },
    {
      icon: 'stats-chart-outline' as const,
      title: 'Estatísticas Detalhadas',
      description: 'Veja padrões e tendências de sono',
    },
    {
      icon: 'calendar-outline' as const,
      title: 'Histórico Completo',
      description: 'Acesse o histórico de sonecas a qualquer momento',
    },
    {
      icon: 'people-outline' as const,
      title: 'Múltiplos Bebês',
      description: 'Gerencie sonecas de mais de um bebê',
    },
    {
      icon: 'sync-outline' as const,
      title: 'Sincronização em Nuvem',
      description: 'Dados seguros e sincronizados entre dispositivos',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: colors.tint + '20' }]}>
            <Ionicons name="star" size={48} color={colors.tint} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            Naninha Premium
          </Text>
          {status === 'expired' ? (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Seu período de teste expirou. Assine para continuar usando o app.
            </Text>
          ) : (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Desbloqueie todos os recursos para acompanhar o sono do seu bebê
            </Text>
          )}
        </View>

        {/* Trial Banner (if applicable) */}
        {status === 'trial' && trialDaysRemaining > 0 && (
          <View style={[styles.trialBanner, { backgroundColor: colors.mint + '30' }]}>
            <Ionicons name="time-outline" size={20} color={colors.mint} />
            <Text style={[styles.trialText, { color: colors.text }]}>
              {trialDaysRemaining === 1 
                ? 'Último dia do período de teste!'
                : `${trialDaysRemaining} dias restantes no período de teste`}
            </Text>
          </View>
        )}

        {/* Features */}
        <View style={styles.featuresContainer}>
          {features.map((feature, index) => (
            <View 
              key={index} 
              style={[styles.featureRow, { borderBottomColor: colors.border }]}
            >
              <View style={[styles.featureIcon, { backgroundColor: colors.tint + '15' }]}>
                <Ionicons name={feature.icon} size={22} color={colors.tint} />
              </View>
              <View style={styles.featureText}>
                <Text style={[styles.featureTitle, { color: colors.text }]}>
                  {feature.title}
                </Text>
                <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
                  {feature.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Pricing */}
        <View style={[styles.pricingCard, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.pricingLabel, { color: colors.textSecondary }]}>
            Assinatura Mensal
          </Text>
          <Text style={[styles.pricingPrice, { color: colors.text }]}>
            {priceString}
          </Text>
          <Text style={[styles.pricingNote, { color: colors.textSecondary }]}>
            Cancele a qualquer momento
          </Text>
        </View>

        {/* Subscribe Button */}
        <TouchableOpacity
          style={[styles.subscribeButton, { backgroundColor: colors.tint }]}
          onPress={purchaseSubscription}
          disabled={isPurchasing}
          activeOpacity={0.8}
        >
          {isPurchasing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={22} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.subscribeButtonText}>
                {status === 'expired' ? 'Assinar Agora' : 'Começar Teste Grátis'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Secondary Info */}
        <Text style={[styles.trialInfo, { color: colors.textSecondary }]}>
          {status !== 'expired' && '7 dias grátis, depois '}
          {priceString} cobrado mensalmente
        </Text>

        {/* Restore Purchases */}
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={restorePurchases}
          disabled={isPurchasing}
        >
          <Text style={[styles.restoreButtonText, { color: colors.tint }]}>
            Restaurar Compras
          </Text>
        </TouchableOpacity>

        {/* Logout option */}
        {onLogout && (
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={onLogout}
          >
            <Text style={[styles.logoutButtonText, { color: colors.textSecondary }]}>
              Sair da conta
            </Text>
          </TouchableOpacity>
        )}

        {/* Legal */}
        <View style={styles.legalContainer}>
          <Text style={[styles.legalText, { color: colors.textSecondary }]}>
            A assinatura será cobrada na sua conta do iTunes ao confirmar a compra. 
            A assinatura renova automaticamente, a menos que seja cancelada pelo menos 
            24 horas antes do fim do período atual. Você pode gerenciar suas assinaturas 
            nas configurações da sua conta após a compra.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 48,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  trialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
  },
  trialText: {
    fontSize: 14,
    fontWeight: '600',
  },
  featuresContainer: {
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 13,
  },
  pricingCard: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  pricingLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  pricingPrice: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  pricingNote: {
    fontSize: 13,
  },
  subscribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  buttonIcon: {
    marginRight: 8,
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  trialInfo: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  restoreButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  logoutButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  logoutButtonText: {
    fontSize: 14,
  },
  legalContainer: {
    marginTop: 8,
  },
  legalText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
});
