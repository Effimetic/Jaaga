import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
  login: (userData: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  hasPermission: (permission: string) => boolean;
  canAccessFeature: (feature: string) => boolean;
  normalizeRole: (role: string) => string;
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

  // Monitor user state changes for debugging
  useEffect(() => {
    console.log('🔄 AuthProvider: User state changed:', user);
    console.log('🔄 AuthProvider: User role:', user?.role);
    console.log('🔄 AuthProvider: User authenticated:', user?.authenticated);
  }, [user]);

  const checkAuthStatus = async () => {
    try {
      console.log('🔄 AuthProvider: Checking auth status...');
      setIsLoading(true);
      
      const currentUser = await userService.getCurrentUser();
      const token = await userService.getAuthToken();
      
      console.log('🔄 AuthProvider: Current user from storage:', currentUser);
      console.log('🔄 AuthProvider: Token exists:', !!token);
      
      if (currentUser && token) {
        // Normalize the role to ensure consistency
        const normalizedUser = {
          ...currentUser,
          role: normalizeRole(currentUser.role)
        };
        console.log('🔄 AuthProvider: Setting normalized user state:', normalizedUser);
        setUser(normalizedUser);
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

  const normalizeRole = (role: string): string => {
    console.log('🔄 AuthProvider: normalizeRole called with:', role);
    if (!role) {
      console.log('🔄 AuthProvider: No role provided, returning PUBLIC');
      return 'PUBLIC';
    }
    
    const normalized = role.toLowerCase().trim();
    console.log('🔄 AuthProvider: Normalized role (lowercase):', normalized);
    
    let result: string;
    switch (normalized) {
      case 'owner':
        result = 'OWNER';
        break;
      case 'agent':
        result = 'AGENT';
        break;
      case 'admin':
      case 'app_owner':
        result = 'APP_OWNER';
        break;
      case 'public':
      default:
        result = 'PUBLIC';
        break;
    }
    
    console.log('🔄 AuthProvider: Role normalization result:', result);
    return result;
  };

  const login = async (userData: User, token: string) => {
    try {
      console.log('🔄 AuthProvider: Login called with userData:', userData);
      console.log('🔄 AuthProvider: UserData type:', typeof userData);
      console.log('🔄 AuthProvider: UserData keys:', Object.keys(userData));
      console.log('🔄 AuthProvider: UserData role:', userData.role);
      console.log('🔄 AuthProvider: UserData role type:', typeof userData.role);
      
      // Normalize the role before storing
      const normalizedUserData = {
        ...userData,
        role: normalizeRole(userData.role)
      };
      
      console.log('🔄 AuthProvider: Normalized user data:', normalizedUserData);
      
      await userService.setCurrentUserSession(normalizedUserData, token);
      setUser(normalizedUserData);
      console.log('🔄 AuthProvider: Normalized user state updated after login:', normalizedUserData);
    } catch (error) {
      console.error('🔄 AuthProvider: Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('🔄 AuthProvider: Logout called');
      console.log('🔄 AuthProvider: Current user state before logout:', user);
      
      // Clear user state first
      setUser(null);
      console.log('🔄 AuthProvider: User state cleared');
      
      // Call API logout endpoint if available
      try {
        console.log('🔄 AuthProvider: Calling API logout endpoint...');
        await apiService.logout();
        console.log('🔄 AuthProvider: API logout successful');
      } catch (apiError) {
        console.log('🔄 AuthProvider: API logout failed, continuing with local logout:', apiError);
      }
      
      // Clear local session
      console.log('🔄 AuthProvider: Clearing local session...');
      await userService.clearCurrentUserSession();
      console.log('🔄 AuthProvider: Local session cleared');
      
      console.log('🔄 AuthProvider: Logout completed successfully');
    } catch (error) {
      console.error('🔄 AuthProvider: Logout error:', error);
      // Ensure user state is cleared even if there's an error
      setUser(null);
      throw error;
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    
    // Define role-based permissions using normalized roles
    const rolePermissions: { [key: string]: string[] } = {
      'PUBLIC': ['view_tickets', 'create_booking', 'view_schedules'],
      'AGENT': ['view_tickets', 'create_booking', 'view_schedules', 'manage_agent_bookings', 'view_agent_account'],
      'OWNER': ['view_tickets', 'create_booking', 'view_schedules', 'manage_boats', 'manage_schedules', 'manage_agent_connections', 'view_owner_account'],
      'APP_OWNER': ['manage_platform', 'view_all_accounts', 'manage_fees']
    };
    
    const userRole = user.role.toUpperCase();
    console.log('🔄 AuthProvider: Checking permission', permission, 'for role', userRole);
    return rolePermissions[userRole]?.includes(permission) || false;
  };

  const canAccessFeature = (feature: string): boolean => {
    if (!user) return false;
    
    // Define feature access by role using normalized roles
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
    console.log('🔄 AuthProvider: Checking feature access', feature, 'for role', userRole);
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
    normalizeRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};