import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Pressable,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/userService';
import { apiService } from '../services/apiService';

interface DashboardStats {
  boat_count: number;
  today_trips: number;
  today_travellers: number;
}

interface User {
  id: number;
  name: string;
  role: string;
  phone: string;
}

export default function DashboardScreen({ navigation }: { navigation: any }) {
  const { user, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>({});

  console.log('🔄 DashboardScreen: Component rendered');
  console.log('🔄 DashboardScreen: user from useAuth:', user);
  console.log('🔄 DashboardScreen: logout function:', typeof logout);

  useEffect(() => {
    console.log('🔄 DashboardScreen: useEffect triggered');
    console.log('🔄 DashboardScreen: Current user state:', user);
    debugAsyncStorage();
    loadDashboardData();
  }, [user]); // Add user as dependency to reload when user changes

  const debugAsyncStorage = async () => {
    try {
      const userData = await userService.getCurrentUser();
      const token = await userService.getAuthToken();
      const userId = await userService.getCurrentUserId();
      
      console.log('🔄 DashboardScreen: AsyncStorage debug:');
      console.log('🔄 DashboardScreen: - userData:', userData);
      console.log('🔄 DashboardScreen: - token:', token);
      console.log('🔄 DashboardScreen: - userId:', userId);
    } catch (error) {
      console.error('🔄 DashboardScreen: Error debugging AsyncStorage:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Get current user
      const currentUser = await userService.getCurrentUser();
      if (currentUser) {
        // setUser(currentUser); // This line is removed as per the new_code
      }

      // Get dashboard stats if user is owner
      if (currentUser?.role === 'owner') {
        try {
          const statsResponse = await apiService.getDashboardStats();
          if (statsResponse.success) {
            setStats(statsResponse.stats || statsResponse.data || {});
          }
        } catch (error) {
          console.error('Failed to load dashboard stats:', error);
        }
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'public':
        return { icon: 'user', label: 'Public User' };
      case 'agent':
        return { icon: 'building', label: 'Agent User' };
      case 'owner':
        return { icon: 'ship', label: 'Boat Owner' };
      case 'admin':
        return { icon: 'crown', label: 'Administrator' };
      default:
        return { icon: 'user', label: 'User' };
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🔄 DashboardScreen: Starting logout process...');
              await logout();
              console.log('🔄 DashboardScreen: Logout completed, navigating to Home...');
              
              // Explicitly navigate to Home screen after logout
              navigation.reset({
                index: 0,
                routes: [{ name: 'Home' }],
              });
              
            } catch (error) {
              console.error('❌ DashboardScreen: Logout error:', error);
              Alert.alert('Logout Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderDashboardContent = () => {
    if (!user) return null;
    
    // Clean the role value and handle case variations
    const userRole = user.role ? user.role.trim().toLowerCase() : '';
    console.log('🔄 Dashboard: User role:', user.role, 'Type:', typeof user.role);
    console.log('🔄 Dashboard: Cleaned role:', userRole);
    
    // If role is empty or undefined, show loading or error
    if (!userRole) {
      console.log('🔄 Dashboard: No role found, showing loading state');
      return (
        <View style={styles.loadingContainer}>
          <FontAwesome5 name="spinner" size={24} color="#007AFF" />
          <Text style={styles.loadingText}>Loading user information...</Text>
        </View>
      );
    }
    
    switch (userRole) {
      case 'owner':
        console.log('🔄 Rendering owner dashboard');
        return (
          <>
            {/* Owner Stats */}
            <View style={styles.ownerStats}>
              <Text style={styles.sectionTitle}>Today's Overview</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <View style={styles.statIcon}>
                    <FontAwesome5 name="ship" size={20} color="#FFF" />
                  </View>
                  <View style={styles.statContent}>
                    <Text style={styles.statValue}>{stats.boats || stats.boat_count || 0}</Text>
                    <Text style={styles.statLabel}>Total Boats</Text>
                  </View>
                </View>
                
                <View style={styles.statCard}>
                  <View style={styles.statIcon}>
                    <FontAwesome5 name="calendar-day" size={20} color="#FFF" />
                  </View>
                  <View style={styles.statContent}>
                    <Text style={styles.statValue}>{stats.today_trips || 0}</Text>
                    <Text style={styles.statLabel}>Today's Trips</Text>
                  </View>
                </View>
                
                <View style={styles.statCard}>
                  <View style={styles.statIcon}>
                    <FontAwesome5 name="users" size={20} color="#FFF" />
                  </View>
                  <View style={styles.statContent}>
                    <Text style={styles.statValue}>{stats.today_travellers || 0}</Text>
                    <Text style={styles.statLabel}>Total Travellers Today</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Owner Quick Actions */}
            <View style={styles.appOptions}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              
              <View style={styles.optionGrid}>
                <TouchableOpacity
                  style={styles.appOption}
                  onPress={() => navigation.navigate('MyBoats')}
                >
                  <View style={styles.optionIcon}>
                    <FontAwesome5 name="ship" size={20} color="#007AFF" />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>My Boats</Text>
                    <Text style={styles.optionSubtitle}>Manage your boat fleet</Text>
                  </View>
                  <View style={styles.optionArrow}>
                    <FontAwesome5 name="chevron-right" size={16} color="#9CA3AF" />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.appOption}
                  onPress={() => navigation.navigate('ScheduleManagement')}
                >
                  <View style={styles.optionIcon}>
                    <FontAwesome5 name="calendar-alt" size={20} color="#007AFF" />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>Manage Schedules</Text>
                    <Text style={styles.optionSubtitle}>Create and edit trip schedules</Text>
                  </View>
                  <View style={styles.optionArrow}>
                    <FontAwesome5 name="chevron-right" size={16} color="#9CA3AF" />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.appOption}
                  onPress={() => navigation.navigate('OwnerSettings')}
                >
                  <View style={styles.optionIcon}>
                    <FontAwesome5 name="cog" size={20} color="#007AFF" />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>Owner Settings</Text>
                    <Text style={styles.optionSubtitle}>Configure payment methods, company info</Text>
                  </View>
                  <View style={styles.optionArrow}>
                    <FontAwesome5 name="chevron-right" size={16} color="#9CA3AF" />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.appOption}
                  onPress={() => navigation.navigate('AgentManagement')}
                >
                  <View style={styles.optionIcon}>
                    <FontAwesome5 name="user-tie" size={20} color="#007AFF" />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>Agent Management</Text>
                    <Text style={styles.optionSubtitle}>Manage agent connections and requests</Text>
                  </View>
                  <View style={styles.optionArrow}>
                    <FontAwesome5 name="chevron-right" size={16} color="#9CA3AF" />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.appOption}
                  onPress={() => navigation.navigate('OwnerAccountBook')}
                >
                  <View style={styles.optionIcon}>
                    <FontAwesome5 name="book" size={20} color="#007AFF" />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>Account Book</Text>
                    <Text style={styles.optionSubtitle}>View financial transactions and reports</Text>
                  </View>
                  <View style={styles.optionArrow}>
                    <FontAwesome5 name="chevron-right" size={16} color="#9CA3AF" />
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Recent Activity */}
            <View style={styles.recentActivity}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <View style={styles.activityCard}>
                <Text style={styles.activityText}>No recent activity</Text>
              </View>
            </View>
          </>
        );

      case 'public':
        console.log('🔄 Rendering public user dashboard');
        return (
          <>
            {/* Public User Stats */}
            <View style={styles.publicStats}>
              <Text style={styles.sectionTitle}>Your Travel Summary</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <View style={styles.statIcon}>
                    <FontAwesome5 name="ticket-alt" size={20} color="#FFF" />
                  </View>
                  <View style={styles.statContent}>
                    <Text style={styles.statValue}>0</Text>
                    <Text style={styles.statLabel}>Total Bookings</Text>
                  </View>
                </View>
                
                <View style={styles.statCard}>
                  <View style={styles.statIcon}>
                    <FontAwesome5 name="check-circle" size={20} color="#FFF" />
                  </View>
                  <View style={styles.statContent}>
                    <Text style={styles.statValue}>0</Text>
                    <Text style={styles.statLabel}>Confirmed</Text>
                  </View>
                </View>
                
                <View style={styles.statCard}>
                  <View style={styles.statIcon}>
                    <FontAwesome5 name="clock" size={20} color="#FFF" />
                  </View>
                  <View style={styles.statContent}>
                    <Text style={styles.statValue}>0</Text>
                    <Text style={styles.statLabel}>Pending</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Public User Quick Actions */}
            <View style={styles.appOptions}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              
              <View style={styles.optionGrid}>
                <TouchableOpacity
                  style={styles.appOption}
                  onPress={() => navigation.navigate('MyTickets')}
                >
                  <View style={styles.optionIcon}>
                    <FontAwesome5 name="ticket-alt" size={20} color="#007AFF" />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>My Tickets</Text>
                    <Text style={styles.optionSubtitle}>View and manage your tickets</Text>
                  </View>
                  <View style={styles.optionArrow}>
                    <FontAwesome5 name="chevron-right" size={16} color="#9CA3AF" />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.appOption}
                  onPress={() => navigation.navigate('Settings')}
                >
                  <View style={styles.optionIcon}>
                    <FontAwesome5 name="cog" size={20} color="#007AFF" />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>Settings</Text>
                    <Text style={styles.optionSubtitle}>Manage your account settings</Text>
                  </View>
                  <View style={styles.optionArrow}>
                    <FontAwesome5 name="chevron-right" size={16} color="#9CA3AF" />
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Welcome Message */}
            <View style={styles.welcomeCard}>
              <FontAwesome5 name="ship" size={40} color="#007AFF" />
              <Text style={styles.welcomeTitle}>Welcome to Nashath Booking!</Text>
              <Text style={styles.welcomeText}>
                Start exploring the beautiful islands of Maldives. Book your speed boat tickets and create unforgettable memories.
              </Text>
              <TouchableOpacity
                style={styles.welcomeButton}
                onPress={() => navigation.navigate('Home')}
              >
                <FontAwesome5 name="search" size={16} color="white" />
                <Text style={styles.welcomeButtonText}>Search for Trips</Text>
              </TouchableOpacity>
            </View>
          </>
        );

      case 'agent':
        console.log('🔄 Rendering agent dashboard');
        return (
          <>
            {/* Agent Stats */}
            <View style={styles.agentStats}>
              <Text style={styles.sectionTitle}>Agent Overview</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <View style={styles.statIcon}>
                    <FontAwesome5 name="handshake" size={20} color="#FFF" />
                  </View>
                  <View style={styles.statContent}>
                    <Text style={styles.statValue}>0</Text>
                    <Text style={styles.statLabel}>Connected Owners</Text>
                  </View>
                </View>
                
                <View style={styles.statCard}>
                  <View style={styles.statIcon}>
                    <FontAwesome5 name="ticket-alt" size={20} color="#FFF" />
                  </View>
                  <View style={styles.statContent}>
                    <Text style={styles.statValue}>0</Text>
                    <Text style={styles.statLabel}>Total Bookings</Text>
                  </View>
                </View>
                
                <View style={styles.statCard}>
                  <View style={styles.statIcon}>
                    <FontAwesome5 name="credit-card" size={20} color="#FFF" />
                  </View>
                  <View style={styles.statContent}>
                    <Text style={styles.statValue}>MVR 0</Text>
                    <Text style={styles.statLabel}>Available Credit</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Agent Quick Actions */}
            <View style={styles.appOptions}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              
              <View style={styles.optionGrid}>
                <TouchableOpacity
                  style={styles.appOption}
                  onPress={() => navigation.navigate('AgentOwners')}
                >
                  <View style={styles.optionIcon}>
                    <FontAwesome5 name="handshake" size={20} color="#007AFF" />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>Connected Owners</Text>
                    <Text style={styles.optionSubtitle}>View boat owners you can book from</Text>
                  </View>
                  <View style={styles.optionArrow}>
                    <FontAwesome5 name="chevron-right" size={16} color="#9CA3AF" />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.appOption}
                  onPress={() => navigation.navigate('Schedules')}
                >
                  <View style={styles.optionIcon}>
                    <FontAwesome5 name="ticket-alt" size={20} color="#007AFF" />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>My Tickets</Text>
                    <Text style={styles.optionSubtitle}>View and manage your tickets</Text>
                  </View>
                  <View style={styles.optionArrow}>
                    <FontAwesome5 name="chevron-right" size={16} color="#9CA3AF" />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.appOption}
                  onPress={() => navigation.navigate('Settings')}
                >
                  <View style={styles.optionIcon}>
                    <FontAwesome5 name="cog" size={20} color="#007AFF" />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>Settings</Text>
                    <Text style={styles.optionSubtitle}>Manage account and send connection requests</Text>
                  </View>
                  <View style={styles.optionArrow}>
                    <FontAwesome5 name="chevron-right" size={16} color="#9CA3AF" />
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Connection Request Info */}
            <View style={styles.infoCard}>
              <FontAwesome5 name="info-circle" size={24} color="#007AFF" />
              <Text style={styles.infoTitle}>Need to Connect with Boat Owners?</Text>
              <Text style={styles.infoText}>
                Go to Settings to send connection requests to boat owners. Once approved, you'll be able to book tickets on their behalf.
              </Text>
            </View>
          </>
                onPress={() => navigation.navigate('Search')}
        )

      default:
        console.log('🔄 Dashboard: Unknown role:', user.role);
        return (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Unknown user role: {user.role}</Text>
            <Text style={styles.errorText}>Please contact support</Text>
          </View>
        );
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <FontAwesome5 name="spinner" size={24} color="#007AFF" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load user data</Text>
        </View>
      </SafeAreaView>
    );
  }

  const roleInfo = getRoleDisplay(user.role);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
          >
            <FontAwesome5 name="arrow-left" size={20} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <TouchableOpacity
            style={[styles.logoutButton, { 
              backgroundColor: '#EF4444', 
              borderRadius: 8, 
              padding: 8,
              borderWidth: 2,
              borderColor: '#DC2626'
            }]} 
            onPress={() => {
              console.log('🔄 DashboardScreen: Corner logout button pressed!');
              Alert.alert('Test', 'Corner logout button pressed!');
              handleLogout();
            }}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <FontAwesome5 name="sign-out-alt" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* User Profile Header */}
        <View style={styles.userProfileHeader}>
          <View style={styles.profileAvatar}>
            <FontAwesome5 name="user-circle" size={50} color="#007AFF" />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user.name}</Text>
            <View style={styles.roleContainer}>
              <FontAwesome5 name={roleInfo.icon} size={14} color="#6B7280" />
              <Text style={styles.roleText}>{roleInfo.label}</Text>
            </View>
            <Text style={styles.phoneText}>{user.phone}</Text>
          </View>
        </View>

        {/* Tab Content */}
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {user ? renderDashboardContent() : null}
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FA' },
  container: { padding: 16 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  logoutButton: {
    padding: 8,
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    padding: 8,
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  userProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  profileAvatar: {
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  roleText: {
    fontSize: 14,
    color: '#6B7280',
  },
  phoneText: {
    fontSize: 14,
    color: '#6B7280',
  },

  ownerStats: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statContent: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },

  appOptions: {
    marginBottom: 24,
  },
  optionGrid: {
    gap: 12,
  },
  appOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  optionArrow: {
    marginLeft: 8,
  },

  recentActivity: {
    marginBottom: 24,
  },
  activityCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  activityText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },

  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
  },

  publicStats: {
    marginBottom: 24,
  },
  welcomeCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  welcomeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    gap: 8,
  },
  welcomeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  agentStats: {
    marginBottom: 24,
  },
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 12,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 12,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20, // Add some padding at the bottom for the last section
  },
});