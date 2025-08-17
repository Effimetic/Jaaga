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
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const isAuth = await userService.isAuthenticated();
      if (isAuth) {
        const userData = await userService.getCurrentUser();
        const token = await userService.getAuthToken();
        
        if (userData && token) {
          try {
            // Verify token with backend
            const profile = await apiService.getProfile();
            setUser({ ...userData, authenticated: true });
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
        // Store the access token and user data
        const userData = {
          id: 1, // This will be updated when we get profile
          phone: result.phone,
          name: `User_${result.phone.slice(-4)}`,
          role: 'public',
          authenticated: true
        };
        
        // Store token for API requests
        await userService.setCurrentUserSession(userData, result.access_token);
        
        // Get actual profile data
        try {
          const profile = await apiService.getProfile();
          if (profile.success) {
            const updatedUserData = {
              id: profile.profile.id || userData.id,
              phone: profile.profile.phone,
              name: profile.profile.name || userData.name,
              role: profile.profile.role || userData.role,
              authenticated: true
            };
            await userService.setCurrentUserSession(updatedUserData, result.access_token);
            setUser(updatedUserData);
          }
        } catch (profileError) {
          console.error('Error getting profile:', profileError);
          // Use basic user data if profile fetch fails
          setUser(userData);
        }
        
        return {
          success: true,
          message: 'Login successful',
          token: result.access_token,
          user: userData
        };
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
      const result = await verifySMS(phone, token);
      
      if (result.success && result.user) {
        setUser(result.user);
      } else {
        throw new Error(result.message || 'Login failed');
      }
    } catch (error) {
      console.error('Error storing auth data:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Use userService to clear session
      await userService.clearCurrentUserSession();
      
      // Update user state
      setUser(null);
    } catch (error) {
      console.error('Error clearing auth data:', error);
      throw error;
    }
  };

  const getCurrentUserId = async (): Promise<number | null> => {
    return await userService.getCurrentUserId();
  };

  const value = { user, isLoading, sendSMS, verifySMS, login, logout, getCurrentUserId };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
