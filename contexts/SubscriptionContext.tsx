import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import {
    endConnection,
    finishTransaction,
    getAvailablePurchases,
    getSubscriptions,
    initConnection,
    purchaseErrorListener,
    purchaseUpdatedListener,
    requestSubscription,
    type ProductPurchase,
    type PurchaseError,
    type Subscription,
} from 'react-native-iap';

import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

// Your App Store Connect product ID for the monthly subscription
export const SUBSCRIPTION_PRODUCT_ID = 'com.felip.naninha.monthly';
const SUBSCRIPTION_SKUS = [SUBSCRIPTION_PRODUCT_ID];

type SubscriptionStatus = 'loading' | 'trial' | 'active' | 'expired' | 'cancelled' | 'none';

interface SubscriptionData {
  id: string;
  user_id: string;
  status: string;
  trial_start_date: string;
  trial_end_date: string;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  product_id: string | null;
  original_transaction_id: string | null;
  created_at: string;
  updated_at: string;
}

interface SubscriptionContextType {
  status: SubscriptionStatus;
  isActive: boolean;
  trialDaysRemaining: number;
  subscription: SubscriptionData | null;
  products: Subscription[];
  isLoading: boolean;
  isPurchasing: boolean;
  purchaseSubscription: () => Promise<void>;
  restorePurchases: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>('loading');
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [products, setProducts] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Calculate if subscription is active (trial or paid)
  const isActive = status === 'trial' || status === 'active';

  // Calculate trial days remaining
  const trialDaysRemaining = React.useMemo(() => {
    if (status !== 'trial' || !subscription?.trial_end_date) return 0;
    const endDate = new Date(subscription.trial_end_date);
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }, [status, subscription?.trial_end_date]);

  // Initialize IAP connection
  useEffect(() => {
    if (Platform.OS !== 'ios') {
      setIsLoading(false);
      return;
    }

    const initIAP = async () => {
      try {
        const connected = await initConnection();
        setIsConnected(connected);
        
        if (connected) {
          // Fetch available products
          const subs = await getSubscriptions({ skus: SUBSCRIPTION_SKUS });
          setProducts(subs);
        }
      } catch (error) {
        console.error('Error initializing IAP:', error);
      }
    };

    initIAP();

    return () => {
      if (isConnected) {
        endConnection();
      }
    };
  }, []);

  // Listen for purchase updates
  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    const purchaseUpdateSubscription = purchaseUpdatedListener(
      async (purchase: ProductPurchase) => {
        console.log('Purchase updated:', purchase);

        if (purchase.transactionId) {
          try {
            // Update subscription in database
            await updateSubscriptionFromPurchase(purchase);
            
            // Finish the transaction
            await finishTransaction({ purchase, isConsumable: false });
            
            // Refresh subscription status
            await fetchSubscription();
            
            setIsPurchasing(false);
            Alert.alert('Sucesso!', 'Sua assinatura foi ativada com sucesso.');
          } catch (error) {
            console.error('Error processing purchase:', error);
            setIsPurchasing(false);
          }
        }
      }
    );

    const purchaseErrorSubscription = purchaseErrorListener((error: PurchaseError) => {
      console.error('Purchase error:', error);
      setIsPurchasing(false);
      
      if (error.code !== 'E_USER_CANCELLED') {
        Alert.alert('Erro', 'Ocorreu um erro ao processar a compra. Tente novamente.');
      }
    });

    return () => {
      purchaseUpdateSubscription.remove();
      purchaseErrorSubscription.remove();
    };
  }, [user?.id]);

  // Update subscription in database from purchase
  const updateSubscriptionFromPurchase = async (purchase: ProductPurchase) => {
    if (!user?.id) return;

    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        subscription_start_date: new Date().toISOString(),
        subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 days
        product_id: purchase.productId,
        original_transaction_id: purchase.transactionId,
      })
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }
  };

  // Fetch subscription from database
  const fetchSubscription = useCallback(async () => {
    if (!user?.id) {
      setStatus('none');
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No subscription found
          setStatus('none');
          setSubscription(null);
        } else {
          console.error('Error fetching subscription:', error);
          setStatus('none');
        }
        setIsLoading(false);
        return;
      }

      setSubscription(data as SubscriptionData);
      
      // Determine status based on subscription data
      const now = new Date();
      const dbStatus = data.status as string;

      if (dbStatus === 'active') {
        // Check if subscription is still valid
        if (data.subscription_end_date) {
          const endDate = new Date(data.subscription_end_date);
          if (now > endDate) {
            // Subscription expired, update in database
            await supabase
              .from('subscriptions')
              .update({ status: 'expired' })
              .eq('user_id', user.id);
            setStatus('expired');
          } else {
            setStatus('active');
          }
        } else {
          setStatus('active');
        }
      } else if (dbStatus === 'trial') {
        // Check if trial is still valid
        const trialEndDate = new Date(data.trial_end_date);
        if (now > trialEndDate) {
          // Trial expired, update in database
          await supabase
            .from('subscriptions')
            .update({ status: 'expired' })
            .eq('user_id', user.id);
          setStatus('expired');
        } else {
          setStatus('trial');
        }
      } else {
        setStatus(dbStatus as SubscriptionStatus);
      }
    } catch (error) {
      console.error('Error in fetchSubscription:', error);
      setStatus('none');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Fetch subscription when user changes
  useEffect(() => {
    if (user?.id) {
      fetchSubscription();
    } else {
      setStatus('none');
      setSubscription(null);
      setIsLoading(false);
    }
  }, [user?.id, fetchSubscription]);

  // Purchase subscription
  const purchaseSubscription = async () => {
    if (!isConnected) {
      Alert.alert('Erro', 'Não foi possível conectar à App Store. Tente novamente.');
      return;
    }

    if (products.length === 0) {
      Alert.alert('Erro', 'Produto não disponível. Tente novamente mais tarde.');
      return;
    }

    setIsPurchasing(true);

    try {
      await requestSubscription({
        sku: SUBSCRIPTION_PRODUCT_ID,
      });
    } catch (error) {
      console.error('Error requesting subscription:', error);
      setIsPurchasing(false);
      Alert.alert('Erro', 'Ocorreu um erro ao iniciar a compra. Tente novamente.');
    }
  };

  // Restore purchases
  const restorePurchases = async () => {
    if (!isConnected) {
      Alert.alert('Erro', 'Não foi possível conectar à App Store. Tente novamente.');
      return;
    }

    setIsPurchasing(true);

    try {
      const purchases = await getAvailablePurchases();
      
      // Find the latest subscription purchase
      const subscriptionPurchase = purchases.find(
        (p) => p.productId === SUBSCRIPTION_PRODUCT_ID
      );

      if (subscriptionPurchase) {
        await updateSubscriptionFromPurchase(subscriptionPurchase);
        await fetchSubscription();
        Alert.alert('Sucesso!', 'Sua assinatura foi restaurada.');
      } else {
        Alert.alert('Informação', 'Nenhuma assinatura encontrada para restaurar.');
      }
    } catch (error) {
      console.error('Error restoring purchases:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao restaurar compras. Tente novamente.');
    } finally {
      setIsPurchasing(false);
    }
  };

  // Refresh subscription status
  const refreshSubscription = async () => {
    setIsLoading(true);
    await fetchSubscription();
  };

  return (
    <SubscriptionContext.Provider
      value={{
        status,
        isActive,
        trialDaysRemaining,
        subscription,
        products,
        isLoading,
        isPurchasing,
        purchaseSubscription,
        restorePurchases,
        refreshSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}

// Helper function to create trial subscription (call after user registration)
export async function createTrialSubscription(userId: string): Promise<{ error: Error | null }> {
  const trialEndDate = new Date();
  trialEndDate.setDate(trialEndDate.getDate() + 7); // 7-day trial

  const { error } = await supabase.from('subscriptions').insert({
    user_id: userId,
    status: 'trial',
    trial_start_date: new Date().toISOString(),
    trial_end_date: trialEndDate.toISOString(),
  });

  return { error: error as Error | null };
}
