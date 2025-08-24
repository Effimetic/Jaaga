import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { userService } from '../services/userService';

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
  login: (userData: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  hasPermission: (permission: string) => boolean;
  canAccessFeature: (feature: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      console.log('🔄 AuthProvider: Checking auth status...');
      setIsLoading(true);
      
      const currentUser = await userService.getCurrentUser();
      const token = await userService.getAuthToken();
      
      console.log('🔄 AuthProvider: Current user from storage:', currentUser);
      console.log('🔄 AuthProvider: Token exists:', !!token);
      
      if (currentUser && token) {
        console.log('🔄 AuthProvider: Setting user state:', currentUser);
        setUser(currentUser);
      } else {
        console.log('🔄 AuthProvider: No valid session found');
        setUser(null);
      }
    } catch (error) {
      console.error('🔄 AuthProvider: Error checking auth status:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
      console.log('🔄 AuthProvider: Auth check completed');
    }
  };

  const login = async (userData: User, token: string) => {
    try {
      console.log('🔄 AuthProvider: Login called with:', userData);
      await userService.setCurrentUserSession(userData, token);
      setUser(userData);
      console.log('🔄 AuthProvider: User state updated after login');
    } catch (error) {
      console.error('🔄 AuthProvider: Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('🔄 AuthProvider: Logout called');
      // Call API logout endpoint if available
      try {
        await apiService.logout();
      } catch (apiError) {
        console.log('🔄 AuthProvider: API logout failed, continuing with local logout');
      }
      
      await userService.clearCurrentUserSession();
      setUser(null);
      console.log('🔄 AuthProvider: User state cleared after logout');
    } catch (error) {
      console.error('🔄 AuthProvider: Logout error:', error);
      throw error;
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    
    // Define role-based permissions
    const rolePermissions: { [key: string]: string[] } = {
      'PUBLIC': ['view_tickets', 'create_booking', 'view_schedules'],
      'AGENT': ['view_tickets', 'create_booking', 'view_schedules', 'manage_agent_bookings', 'view_agent_account'],
      'OWNER': ['view_tickets', 'create_booking', 'view_schedules', 'manage_boats', 'manage_schedules', 'manage_agent_connections', 'view_owner_account'],
      'APP_OWNER': ['manage_platform', 'view_all_accounts', 'manage_fees']
    };
    
    const userRole = user.role.toUpperCase();
    return rolePermissions[userRole]?.includes(permission) || false;
  };

  const canAccessFeature = (feature: string): boolean => {
    if (!user) return false;
    
    // Define feature access by role
    const featureAccess: { [key: string]: string[] } = {
      'boat_management': ['OWNER'],
      'schedule_management': ['OWNER'],
      'agent_management': ['OWNER'],
      'owner_settings': ['OWNER'],
      'agent_connections': ['AGENT'],
      'agent_account_book': ['AGENT'],
      'platform_management': ['APP_OWNER']
    };
    
    const userRole = user.role.toUpperCase();
    return featureAccess[feature]?.includes(userRole) || false;
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    logout,
    setUser,
    hasPermission,
    canAccessFeature,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};