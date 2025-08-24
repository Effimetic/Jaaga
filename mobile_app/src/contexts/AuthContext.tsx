import React, { createContext, useContext, useState, useEffect } from 'react';
import { userService } from '../services/userService';
import { apiService } from '../services/apiService';

interface User {
  id: number;
  phone: string;
  name: string;
  role: string;
  authenticated: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  sendSMS: (phone: string) => Promise<{ success: boolean; message: string; debug_code?: string }>;
  verifySMS: (phone: string, token: string) => Promise<{ success: boolean; message: string; token?: string; user?: User }>;
  login: (phone: string, token: string) => Promise<void>;
  logout: () => Promise<void>;
  getCurrentUserId: () => Promise<number | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Wrapper function for setUser with debugging
  const setUser = (newUser: User | null) => {
    console.log('AuthContext.setUser called with:', newUser);
    console.log('Previous user state was:', user);
    setUserState(newUser);
    console.log('User state updated to:', newUser);
  };

  useEffect(() => {
    // Check if user is already logged in
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const isAuth = await userService.isAuthenticated();
      console.log('🔄 checkAuthStatus: isAuth:', isAuth);
      
      if (isAuth) {
        const userData = await userService.getCurrentUser();
        const token = await userService.getAuthToken();
        
        console.log('🔄 checkAuthStatus: userData from AsyncStorage:', userData);
        console.log('🔄 checkAuthStatus: token:', token);
        
        if (userData && token) {
          try {
            // Verify token with backend
            const profile = await apiService.getProfile();
            console.log('🔄 checkAuthStatus: profile from API:', profile);
            
            if (profile.success && profile.user) {
              const updatedUserData = { 
                ...userData, 
                ...profile.user,  // Override with fresh data from API
                authenticated: true 
              };
              console.log('🔄 checkAuthStatus: setting user to:', updatedUserData);
              setUser(updatedUserData);
            } else {
              console.log('🔄 checkAuthStatus: profile not successful, using stored user data');
              const updatedUserData = { ...userData, authenticated: true };
              setUser(updatedUserData);
            }
          } catch (error) {
            console.error('Error verifying token:', error);
            await userService.clearCurrentUserSession();
          }
        }
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendSMS = async (phone: string) => {
    try {
      const result = await apiService.sendSMS(phone);
      return {
        success: true,
        message: result.message,
        debug_code: result.debug_code || '123456' // Fallback for testing
      };
    } catch (error: any) {
      console.error('Error sending SMS:', error);
      return {
        success: false,
        message: error.message || 'Failed to send SMS'
      };
    }
  };

  const verifySMS = async (phone: string, token: string) => {
    try {
      const result = await apiService.verifyToken(phone, token);
      
      if (result.success) {
        // Store token for API requests FIRST
        await userService.setCurrentUserSession({
          id: 0, // Temporary ID, will be updated from profile
          phone: result.phone,
          name: `User_${result.phone.slice(-4)}`, // Temporary name
          role: 'public', // Default role, will be updated from profile
          authenticated: true
        }, result.access_token);
        
        console.log('🔄 verifySMS: Token stored, waiting for AsyncStorage to update...');
        // Wait a bit for AsyncStorage to update
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Get updated profile data using the token
        try {
          console.log('🔄 verifySMS: About to fetch profile with token:', result.access_token);
          const profile = await apiService.getProfile();
          console.log('🔄 verifySMS: profile response:', profile);
          
          if (profile.success && profile.user) {
            const userData = {
              id: profile.user.id,
              phone: profile.user.phone,
              name: profile.user.name,
              role: profile.user.role,
              authenticated: true
            };
            console.log('🔄 verifySMS: setting user data from profile:', userData);
            await userService.setCurrentUserSession(userData, result.access_token);
            setUser(userData);
            
            return {
              success: true,
              message: 'Login successful',
              token: result.access_token,
              user: userData
            };
          } else {
            console.error('🔄 verifySMS: Profile response not successful:', profile);
            throw new Error(`Profile fetch failed: ${profile.error || 'Unknown error'}`);
          }
        } catch (profileError: any) {
          console.error('🔄 verifySMS: Error getting profile:', profileError);
          console.error('🔄 verifySMS: Profile error details:', {
            message: profileError.message,
            stack: profileError.stack
          });
          
          // If profile fails, still allow login with basic user data
          const basicUserData = {
            id: 0,
            phone: result.phone,
            name: `User_${result.phone.slice(-4)}`,
            role: 'public',
            authenticated: true
          };
          console.log('🔄 verifySMS: Falling back to basic user data:', basicUserData);
          setUser(basicUserData);
          
          return {
            success: true,
            message: 'Login successful (basic profile)',
            token: result.access_token,
            user: basicUserData
          };
        }
      } else {
        return {
          success: false,
          message: result.error || 'Verification failed'
        };
      }
    } catch (error: any) {
      console.error('Error verifying token:', error);
      return {
        success: false,
        message: error.message || 'Failed to verify token'
      };
    }
  };

  const login = async (phone: string, token: string) => {
    try {
      console.log('AuthContext.login called with phone:', phone);
      const result = await verifySMS(phone, token);
      console.log('verifySMS result:', result);
      
      if (result.success && result.user) {
        console.log('Setting user state to:', result.user);
        setUser(result.user);
        console.log('User state updated successfully');
      } else {
        throw new Error(result.message || 'Login failed');
      }
    } catch (error) {
      console.error('Error in AuthContext.login:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('🔄 AuthContext.logout called');
      console.log('🔄 Current user state before logout:', user);
      
      // Use userService to clear session
      await userService.clearCurrentUserSession();
      console.log('🔄 Session cleared from userService');
      
      // Update user state
      setUser(null);
      console.log('🔄 User state set to null');
      
      console.log('🔄 Logout completed successfully');
      
      // Force a small delay to ensure state update is processed
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error('❌ Error in AuthContext.logout:', error);
      throw error;
    }
  };

  const getCurrentUserId = async (): Promise<number | null> => {
    return await userService.getCurrentUserId();
  };

  const value = { user, isLoading, setUser, sendSMS, verifySMS, login, logout, getCurrentUserId };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
