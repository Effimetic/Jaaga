import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: number;
  phone: string;
  name: string;
  role: string;
  authenticated: boolean;
}

export const userService = {
  /**
   * Set current user session after successful login
   * @param user - User object containing user information
   * @param token - Authentication token
   */
  setCurrentUserSession: async (user: User, token: string): Promise<void> => {
    try {
      await AsyncStorage.setItem('auth_token', token);
      await AsyncStorage.setItem('user_data', JSON.stringify(user));
      await AsyncStorage.setItem('CurrentUserID', user.id.toString());
    } catch (error) {
      console.error('Error setting current user session:', error);
      throw error;
    }
  },

  /**
   * Clear current user session on logout
   */
  clearCurrentUserSession: async (): Promise<void> => {
    try {
      console.log('🔄 userService: Starting to clear current user session...');
      
      // Check what's in storage before clearing
      const token = await AsyncStorage.getItem('auth_token');
      const userData = await AsyncStorage.getItem('user_data');
      const userId = await AsyncStorage.getItem('CurrentUserID');
      
      console.log('🔄 userService: Before clearing - token exists:', !!token, 'userData exists:', !!userData, 'userId exists:', !!userId);
      
      await AsyncStorage.multiRemove(['auth_token', 'user_data', 'CurrentUserID']);
      
      // Verify clearing worked
      const tokenAfter = await AsyncStorage.getItem('auth_token');
      const userDataAfter = await AsyncStorage.getItem('user_data');
      const userIdAfter = await AsyncStorage.getItem('CurrentUserID');
      
      console.log('🔄 userService: After clearing - token exists:', !!tokenAfter, 'userData exists:', !!userDataAfter, 'userId exists:', !!userIdAfter);
      console.log('🔄 userService: Current user session cleared successfully');
    } catch (error) {
      console.error('🔄 userService: Error clearing current user session:', error);
      throw error;
    }
  },

  /**
   * Get current user ID from AsyncStorage
   * @returns Current user ID or null if not found
   */
  getCurrentUserId: async (): Promise<number | null> => {
    try {
      const userId = await AsyncStorage.getItem('CurrentUserID');
      return userId ? parseInt(userId, 10) : null;
    } catch (error) {
      console.error('Error getting current user ID:', error);
      return null;
    }
  },

  /**
   * Get current user data from AsyncStorage
   * @returns Current user object or null if not found
   */
  getCurrentUser: async (): Promise<User | null> => {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  /**
   * Get authentication token from AsyncStorage
   * @returns Authentication token or null if not found
   */
  getAuthToken: async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem('auth_token');
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  },

  /**
   * Check if user is authenticated
   * @returns True if user has valid session, false otherwise
   */
  isAuthenticated: async (): Promise<boolean> => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const userId = await AsyncStorage.getItem('CurrentUserID');
      return !!(token && userId);
    } catch (error) {
      console.error('Error checking authentication status:', error);
      return false;
    }
  }
};
