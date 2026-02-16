import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

interface Profile {
  id: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithApple: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (name: string) => Promise<{ error: Error | null }>;
  deleteAccount: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile from profiles table
  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data as Profile;
  };

  // Initialize session on mount
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const userProfile = await fetchProfile(session.user.id);
        setProfile(userProfile);
      }

      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const userProfile = await fetchProfile(session.user.id);
          setProfile(userProfile);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Sign up with email, password, and name
  const signUp = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name, // This gets passed to the trigger function
        },
      },
    });

    return { error: error as Error | null };
  };

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error: error as Error | null };
  };

  // Sign in with Apple
  const signInWithApple = async () => {
    try {
      const nonce = Math.random().toString(36).substring(2, 10);
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        nonce
      );

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      const identityToken = credential.identityToken;
      if (!identityToken) {
        return { error: new Error('No identity token returned from Apple') };
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: identityToken,
        nonce,
      });

      if (error) {
        return { error: error as Error };
      }

      // Update profile name if Apple provided it (only on first sign-in)
      if (credential.fullName?.givenName) {
        const fullName = [credential.fullName.givenName, credential.fullName.familyName]
          .filter(Boolean)
          .join(' ');

        // Wait briefly for the auth state to update
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession?.user) {
          await supabase
            .from('profiles')
            .update({ name: fullName })
            .eq('id', currentSession.user.id);
        }
      }

      return { error: null };
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        return { error: null }; // User cancelled, not an error
      }
      return { error: error as Error };
    }
  };

  // Sign out
  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  // Update profile name
  const updateProfile = async (name: string) => {
    if (!user) return { error: new Error('No user logged in') };

    const { error } = await supabase
      .from('profiles')
      .update({ name, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (!error) {
      setProfile((prev) => (prev ? { ...prev, name } : null));
    }

    return { error: error as Error | null };
  };

  // Delete account - calls Edge Function for full deletion
  const deleteAccount = async () => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      // Get current session for authorization
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession?.access_token) {
        return { error: new Error('No active session') };
      }

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) {
        return { error: new Error('Supabase URL not configured') };
      }

      // Call Edge Function to delete user (requires admin API)
      // Try "delete-user" first, then "delete" as fallback
      const functionUrl = `${supabaseUrl}/functions/v1/delete-user`;
      
      console.log('Calling delete function:', functionUrl);

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status);

      const result = await response.json();
      console.log('Response body:', result);

      if (!response.ok) {
        return { error: new Error(result.error || `HTTP ${response.status}`) };
      }

      // Clear local state
      setSession(null);
      setUser(null);
      setProfile(null);

      return { error: null };
    } catch (error) {
      console.error('Error deleting account:', error);
      return { error: error as Error };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        signUp,
        signIn,
        signInWithApple,
        signOut,
        updateProfile,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
