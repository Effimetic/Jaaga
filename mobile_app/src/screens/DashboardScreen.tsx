import React, { useEffect, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { apiService } from '../services/apiService';
import { userService } from '../services/userService';

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
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    boat_count: 0,
    today_trips: 0,
    today_travellers: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Get current user
      const currentUser = await userService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
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
              await userService.clearCurrentUserSession();
              // Navigation will be handled by AuthContext
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
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
          <Text style={styles.headerTitle}>Dashboard</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <FontAwesome5 name="sign-out-alt" size={20} color="#EF4444" />
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

        {/* Owner Stats - Only show for boat owners */}
        {user.role === 'owner' && (
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
        )}

        {/* Quick Actions */}
        <View style={styles.appOptions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.optionGrid}>
            {/* My Boats - Only for owners */}
            {user.role === 'owner' && (
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
            )}

            {/* Manage Schedules - Only for owners */}
            {user.role === 'owner' && (
              <TouchableOpacity
                style={styles.appOption}
                onPress={() => navigation.navigate('Schedules')}
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
            )}

            {/* Agent Owners - Only for agents */}
            {user.role === 'agent' && (
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
            )}

            {/* Agent Connections - Only for owners */}
            {user.role === 'owner' && (
              <TouchableOpacity
                style={styles.appOption}
                onPress={() => navigation.navigate('AgentConnections')}
              >
                <View style={styles.optionIcon}>
                  <FontAwesome5 name="user-tie" size={20} color="#007AFF" />
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>Agent Connections</Text>
                  <Text style={styles.optionSubtitle}>Manage agent credit relationships</Text>
                </View>
                <View style={styles.optionArrow}>
                  <FontAwesome5 name="chevron-right" size={16} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            )}

            {/* Settings - For all users */}
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

            {/* Book Tickets - For public users and agents */}
            {(user.role === 'public' || user.role === 'agent') && (
              <TouchableOpacity
                style={styles.appOption}
                onPress={() => navigation.navigate('BookTickets')}
              >
                <View style={styles.optionIcon}>
                  <FontAwesome5 name="ticket-alt" size={20} color="#007AFF" />
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>Book Tickets</Text>
                  <Text style={styles.optionSubtitle}>Search and book speed boat tickets</Text>
                </View>
                <View style={styles.optionArrow}>
                  <FontAwesome5 name="chevron-right" size={16} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            )}

            {/* My Bookings - For all users */}
            <TouchableOpacity
              style={styles.appOption}
              onPress={() => navigation.navigate('MyBookings')}
            >
              <View style={styles.optionIcon}>
                <FontAwesome5 name="list-alt" size={20} color="#007AFF" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>My Bookings</Text>
                <Text style={styles.optionSubtitle}>View your booking history</Text>
              </View>
              <View style={styles.optionArrow}>
                <FontAwesome5 name="chevron-right" size={16} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activity - Only for owners */}
        {user.role === 'owner' && (
          <View style={styles.recentActivity}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <View style={styles.activityCard}>
              <Text style={styles.activityText}>No recent activity</Text>
            </View>
          </View>
        )}
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
});