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
      // For now, we'll need to handle the redirect response
      // The backend returns a redirect URL, so we'll need to extract user info differently
      return {
        success: true,
        message: 'Login successful',
        token: 'temp_token', // We'll need to get the actual token from the response
        user: {
          id: 1, // This should come from the backend
          phone: phone,
          name: `User_${phone.slice(-4)}`,
          role: 'public',
          authenticated: true
        }
      };
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
      const userData = {
        id: 1, // This should come from the backend
        phone: phone,
        name: `User_${phone.slice(-4)}`,
        role: 'public'
      };
      
      // Use userService to set session
      await userService.setCurrentUserSession(userData, token);
      
      // Update user state
      setUser({ ...userData, authenticated: true });
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
