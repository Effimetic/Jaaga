import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import { Agent, Owner, User, UserInsert, UserUpdate } from '../types';

export class UserService {
  private static instance: UserService;
  private readonly USER_TOKEN_KEY = 'user_token';
  private readonly CURRENT_USER_ID_KEY = 'CurrentUserID';

  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  /**
   * Set the current user session in AsyncStorage
   * Stores both the authentication token and the user's personID as CurrentUserID
   */
  async setCurrentUserSession(user: User, token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(this.USER_TOKEN_KEY, token);
      await AsyncStorage.setItem(this.CURRENT_USER_ID_KEY, user.id);
      console.log('User session set successfully');
    } catch (error) {
      console.error('Error setting user session:', error);
      throw error;
    }
  }

  /**
   * Clear the current user session from AsyncStorage
   * Removes both the token and CurrentUserID
   */
  async clearCurrentUserSession(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([this.USER_TOKEN_KEY, this.CURRENT_USER_ID_KEY]);
      console.log('User session cleared successfully');
    } catch (error) {
      console.error('Error clearing user session:', error);
      throw error;
    }
  }

  /**
   * Get the current user's personID from AsyncStorage
   */
  async getCurrentUserId(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.CURRENT_USER_ID_KEY);
    } catch (error) {
      console.error('Error getting current user ID:', error);
      return null;
    }
  }

  /**
   * Get the current authentication token
   */
  async getCurrentUserToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.USER_TOKEN_KEY);
    } catch (error) {
      console.error('Error getting user token:', error);
      return null;
    }
  }

  /**
   * Create a new user
   */
  async createUser(userData: UserInsert): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single();

      if (error) {
        console.error('Error creating user:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error creating user:', error);
      return null;
    }
  }

  /**
   * Get user by phone number
   */
  async getUserByPhone(phone: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('phone', phone)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found
          return null;
        }
        console.error('Error getting user by phone:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting user by phone:', error);
      return null;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error getting user by ID:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  /**
   * Update user information
   */
  async updateUser(id: string, updates: UserUpdate): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating user:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error updating user:', error);
      return null;
    }
  }

  /**
   * Get current user with profile data
   */
  async getCurrentUserWithProfile(): Promise<{
    user: User;
    agent?: Agent;
    owner?: Owner;
  } | null> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) return null;

      const user = await this.getUserById(userId);
      if (!user) return null;

      let agent: Agent | undefined;
      let owner: Owner | undefined;

      // Get agent profile if user is an agent
      if (user.role === 'AGENT') {
        const { data: agentData } = await supabase
          .from('agents')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (agentData) agent = agentData;
      }

      // Get owner profile if user is an owner
      if (user.role === 'OWNER') {
        const { data: ownerData } = await supabase
          .from('owners')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (ownerData) owner = ownerData;
      }

      return { user, agent, owner };
    } catch (error) {
      console.error('Error getting current user with profile:', error);
      return null;
    }
  }

  /**
   * Check if user has required permissions for a role
   */
  hasPermission(userRole: string, requiredRole: string): boolean {
    const roleHierarchy: Record<string, number> = {
      'PUBLIC': 1,
      'AGENT': 2,
      'OWNER': 3,
      'APP_OWNER': 4,
    };

    const userLevel = roleHierarchy[userRole] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;

    return userLevel >= requiredLevel;
  }

  /**
   * Create agent profile
   */
  async createAgentProfile(userId: string, agentData: Omit<Agent, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Agent | null> {
    try {
      const { data, error } = await supabase
        .from('agents')
        .insert([{ ...agentData, user_id: userId }])
        .select()
        .single();

      if (error) {
        console.error('Error creating agent profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error creating agent profile:', error);
      return null;
    }
  }

  /**
   * Create owner profile
   */
  async createOwnerProfile(userId: string, ownerData: Omit<Owner, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Owner | null> {
    try {
      const { data, error } = await supabase
        .from('owners')
        .insert([{ ...ownerData, user_id: userId }])
        .select()
        .single();

      if (error) {
        console.error('Error creating owner profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error creating owner profile:', error);
      return null;
    }
  }

  /**
   * Update user role
   */
  async updateUserRole(id: string, newRole: 'PUBLIC' | 'AGENT' | 'OWNER' | 'APP_OWNER'): Promise<User | null> {
    try {
      return await this.updateUser(id, { role: newRole });
    } catch (error) {
      console.error('Error updating user role:', error);
      return null;
    }
  }

  /**
   * Validate phone number format for Maldives
   */
  validateMaldivesPhone(phone: string): { isValid: boolean; formatted?: string } {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // Check if it's a valid Maldives number
    if (digits.startsWith('960')) {
      // Already includes country code
      if (digits.length === 10) {
        return { isValid: true, formatted: `+${digits}` };
      }
    } else if (digits.length === 7) {
      // Local number without country code
      return { isValid: true, formatted: `+960${digits}` };
    }
    
    return { isValid: false };
  }
}

// Export singleton instance
export const userService = UserService.getInstance();
