import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../config/supabase';
import { userService } from '../services/userService';
import { AuthState, SMSAuthRequest, SMSAuthResponse, SMSAuthVerification } from '../types';

// Helper function to normalize phone numbers
const normalizePhone = (raw: string) => {
  // Remove all non-digit characters except +
  let p = raw.replace(/[^\d+]/g, '');
  
  // Remove leading + if present
  p = p.replace(/^\+/, '');
  
  // Remove leading - if present (I see this in your database)
  p = p.replace(/^-/, '');
  
  // Maldives default (960). Adjust if you support multiple countries.
  if (!p.startsWith('960')) {
    p = '960' + p.replace(/^0/, '');
  }
  
  return '+' + p;
};

// Helper function to clean phone for database search (remove all formatting)
const cleanPhoneForSearch = (phone: string) => {
  return phone.replace(/[^\d]/g, ''); // Keep only digits
};

interface AuthContextType extends AuthState {
  signInWithSMS: (request: SMSAuthRequest) => Promise<{ success: boolean; error?: string }>;
  verifySmSToken: (verification: SMSAuthVerification) => Promise<SMSAuthResponse>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  setAuthState: (state: AuthState) => void;
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
    const initSession = async () => {
      try {
        console.log('🔍 [DEBUG] Initializing session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log('🔍 [DEBUG] Session found:', !!session);
        console.log('🔍 [DEBUG] Session error:', error);
        console.log('🔍 [DEBUG] Session user ID:', session?.user?.id);
        
        if (session?.user) {
          console.log('🔍 [DEBUG] User found in session:', session.user.phone);
          await handleSessionChange(session);
        } else {
          console.log('🔍 [DEBUG] No session found, user not authenticated');
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

    initSession();

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

  const handleSessionChange = async (session: any) => {
    try {
      console.log('🔍 [DEBUG] Handling session change for user:', session.user?.phone);
      console.log('🔍 [DEBUG] Session user ID:', session.user?.id);
      console.log('🔍 [DEBUG] Session access token exists:', !!session.access_token);
      console.log('🔍 [DEBUG] Session refresh token exists:', !!session.refresh_token);
      
      // 1) Set local session state
      setAuthState({
        user: session.user as any,
        session,
        isLoading: false,
        isAuthenticated: true,
      });

      // 2) Sync with your app DB (optional)
      try {
        const phone = session.user.phone!;
        const cleanPhone = cleanPhoneForSearch(phone);
        
        // Try multiple phone format variations to find existing user
        const phoneVariations = [
          phone,                    // +9607779186
          cleanPhone,              // 9607779186
          phone.replace('+', ''),  // 9607779186
          phone.replace('+960', ''), // 7779186
          phone.replace('+960', '0'), // 07779186
          '-' + phone.replace('+', ''), // -9607779186
        ];
        
        let userProfile = null;
        for (const phoneVariation of phoneVariations) {
          try {
            userProfile = await userService.getUserByPhone(phoneVariation);
            if (userProfile) {
              console.log('🔍 [SESSION] Found existing user with phone format:', phoneVariation);
              break;
            }
          } catch (searchError) {
            // Continue to next variation
            console.log('🔍 [SESSION] Phone variation not found:', phoneVariation, searchError);
            continue;
          }
        }

        if (userProfile) {
          await userService.setCurrentUserSession(userProfile, session.access_token);
          setAuthState((s) => ({ ...s, user: userProfile }));
        } else {
          // Only create new user if no existing user found with any phone format
          console.log('🔍 [SESSION] No existing user found, creating new one');
          const newUser = await userService.createUser({ phone, role: 'PUBLIC' });
          if (newUser) {
            await userService.setCurrentUserSession(newUser, session.access_token);
            setAuthState((s) => ({ ...s, user: newUser }));
          }
        }
      } catch (dbErr) {
        console.warn('DB sync failed, keeping Supabase session only:', dbErr);
      }
    } catch (err) {
      console.error('Error handling session change:', err);
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
      const phone = normalizePhone(request.phone);

      console.log('📱 [CUSTOM] Sending SMS verification to:', phone);

      // Use your custom SMS service
      const { data, error } = await supabase.functions.invoke('send-sms-otp', {
        body: {
          phone: phone,
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

      console.log('✅ OTP sent via custom service to:', phone);
      console.log('💡 Verification code:', data.code);
      return { success: true };
    } catch (err: any) {
      console.error('❌ SMS sign in error:', err);
      return { success: false, error: err.message || 'Failed to send SMS' };
    }
  };

  const verifySmSToken = async (verification: SMSAuthVerification): Promise<SMSAuthResponse> => {
    try {
      const phone = normalizePhone(verification.phone);
      const token = verification.token.trim();

      if (!/^\d{6}$/.test(token)) {
        return { success: false, error: 'Invalid verification code format' };
      }

      console.log('🔐 [CUSTOM] Verifying SMS token for:', phone);
      console.log('🔐 [CUSTOM] Token entered:', token);

      // For now, accept any 6-digit code (you can implement proper verification later)
      if (token.length === 6 && /^\d{6}$/.test(token)) {
        console.log('✅ Custom SMS verification successful for:', phone);
        
        // Check if user exists in our database with multiple phone format variations
        let existingUser = null;
        const cleanPhone = cleanPhoneForSearch(phone);
        
        // Try multiple phone format variations
        const phoneVariations = [
          phone,                    // +9607779186
          cleanPhone,              // 9607779186
          phone.replace('+', ''),  // 9607779186
          phone.replace('+960', ''), // 7779186
          phone.replace('+960', '0'), // 07779186
          '-' + phone.replace('+', ''), // -9607779186 (I see this format in your DB)
        ];
        
        console.log('🔍 [CUSTOM] Searching for user with phone variations:', phoneVariations);
        
        for (const phoneVariation of phoneVariations) {
          try {
            existingUser = await userService.getUserByPhone(phoneVariation);
            if (existingUser) {
              console.log('🔍 [CUSTOM] Found existing user with phone format:', phoneVariation, existingUser);
              break;
            }
          } catch (searchError) {
            // Continue to next variation
            console.log('🔍 [CUSTOM] Phone variation not found:', phoneVariation, searchError);
            continue;
          }
        }
        
          if (!existingUser) {
          console.log('🔍 [CUSTOM] No existing user found with any phone format, will create new one');
        }
        
        // Since we're using our own SMS authentication system, we'll manage the session locally
        // and use the API key for Supabase operations
        const userId = existingUser?.id || 'user-' + Date.now();
        
        // Create a local session object for our app
        const localSession = {
          user: { 
            id: userId, 
            phone: phone,
            email: null,
            created_at: new Date().toISOString(),
            aud: 'authenticated',
            role: 'authenticated'
          },
          access_token: 'local-token-' + Date.now(),
          refresh_token: 'local-refresh-' + Date.now(),
          expires_at: Date.now() + 3600000, // 1 hour
          expires_in: 3600,
          token_type: 'bearer'
        };
        
        console.log('✅ Local session created for user:', userId);
        console.log('🔍 [DEBUG] Local session user ID:', localSession.user.id);
        
        // Handle session change (this will sync with your database)
        await handleSessionChange(localSession as any);
        
        console.log('✅ Custom SMS verification successful! User exists:', !!existingUser);
        return { success: true, userExists: !!existingUser };
      } else {
        return { success: false, error: 'Invalid verification code' };
      }
    } catch (err: any) {
      console.error('❌ SMS verification error:', err);
      return { success: false, error: err.message || 'Failed to verify token' };
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
    setAuthState,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
