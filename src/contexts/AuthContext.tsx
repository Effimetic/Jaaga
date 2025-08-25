import { Session } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../config/supabase';
import { userService } from '../services/userService';
import { AuthState, SMSAuthRequest, SMSAuthVerification } from '../types';

interface AuthContextType extends AuthState {
  signInWithSMS: (request: SMSAuthRequest) => Promise<{ success: boolean; error?: string }>;
  verifySmSToken: (verification: SMSAuthVerification) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    // Initialize session
    initializeSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.phone);
        
        if (session?.user) {
          await handleSessionChange(session);
        } else {
          setAuthState({
            user: null,
            session: null,
            isLoading: false,
            isAuthenticated: false,
          });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const initializeSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        await handleSessionChange(session);
      } else {
        setAuthState({
          user: null,
          session: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    } catch (error) {
      console.error('Error initializing session:', error);
      setAuthState({
        user: null,
        session: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  const handleSessionChange = async (session: Session) => {
    try {
      // Get user profile from our database
      const userProfile = await userService.getUserByPhone(session.user.phone!);
      
      if (userProfile) {
        // Store user session
        await userService.setCurrentUserSession(userProfile, session.access_token);
        
        setAuthState({
          user: userProfile,
          session,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        // Create new user if doesn't exist
        const newUser = await userService.createUser({
          phone: session.user.phone!,
          role: 'PUBLIC',
        });
        
        if (newUser) {
          await userService.setCurrentUserSession(newUser, session.access_token);
          
          setAuthState({
            user: newUser,
            session,
            isLoading: false,
            isAuthenticated: true,
          });
        } else {
          throw new Error('Failed to create user');
        }
      }
    } catch (error) {
      console.error('Error handling session change:', error);
      setAuthState({
        user: null,
        session: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  const signInWithSMS = async (request: SMSAuthRequest): Promise<{ success: boolean; error?: string }> => {
    try {
      // Format phone number (ensure it starts with +960 for Maldives)
      let formattedPhone = request.phone.replace(/\s+/g, '').replace(/^\+/, '');
      if (!formattedPhone.startsWith('960')) {
        formattedPhone = '960' + formattedPhone.replace(/^0/, '');
      }
      formattedPhone = '+' + formattedPhone;

      console.log('📱 [TESTING] Sending SMS verification to:', formattedPhone);
      console.log('📱 [TESTING] Phone number format:', request.phone, '→', formattedPhone);

      // Call our custom SMS service via Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('send-sms-otp', {
        body: {
          phone: formattedPhone,
          purpose: 'login'
        }
      });

      if (error) {
        console.error('❌ Custom SMS service error:', error);
        return { success: false, error: error.message };
      }

      if (!data.success) {
        console.error('❌ Custom SMS service failed:', data.error);
        return { success: false, error: data.error || 'Failed to send SMS' };
      }

      console.log('✅ [TESTING] Custom SMS verification sent successfully to:', formattedPhone);
      console.log('💡 [TESTING] Verification code:', data.code);
      console.log('💡 [TESTING] Message:', data.message);

      return { success: true };
    } catch (error: any) {
      console.error('❌ SMS sign in error:', error);
      return { success: false, error: error.message || 'Failed to send SMS' };
    }
  };

  const verifySmSToken = async (verification: SMSAuthVerification): Promise<{ success: boolean; error?: string }> => {
    try {
      // Format phone number
      let formattedPhone = verification.phone.replace(/\s+/g, '').replace(/^\+/, '');
      if (!formattedPhone.startsWith('960')) {
        formattedPhone = '960' + formattedPhone.replace(/^0/, '');
      }
      formattedPhone = '+' + formattedPhone;

      console.log('🔐 [TESTING] Verifying SMS token for:', formattedPhone);
      console.log('🔐 [TESTING] Token entered:', verification.token);
      console.log('🔐 [TESTING] Token length:', verification.token.length);

      // For now, we'll simulate verification since we're returning the code
      // Later, you can implement proper verification against stored codes
      
      if (verification.token.length === 6 && /^\d{6}$/.test(verification.token)) {
        console.log('✅ [TESTING] SMS verification successful for:', formattedPhone);
        console.log('✅ [TESTING] User authenticated successfully');
        console.log('💡 [DEV] This is simulated verification - implement proper verification later');
        
        return { success: true };
      } else {
        console.log('❌ [TESTING] Invalid token format');
        return { success: false, error: 'Invalid verification code format' };
      }

      // TODO: Later implement proper verification:
      // 1. Store verification codes in database with expiration
      // 2. Verify against stored codes
      // 3. Check expiration time
      // 4. Mark codes as used
      
    } catch (error: any) {
      console.error('❌ SMS verification error:', error);
      return { success: false, error: error.message || 'Failed to verify token' };
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      await userService.clearCurrentUserSession();
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const refreshSession = async (): Promise<void> => {
    try {
      const { data: { session } } = await supabase.auth.refreshSession();
      if (session) {
        await handleSessionChange(session);
      }
    } catch (error) {
      console.error('Error refreshing session:', error);
    }
  };

  const contextValue: AuthContextType = {
    ...authState,
    signInWithSMS,
    verifySmSToken,
    signOut,
    refreshSession,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
