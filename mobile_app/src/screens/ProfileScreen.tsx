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

import { userService } from '../services/userService';
import { useAuth } from '../contexts/AuthContext';

interface User {
  id: number;
  name: string;
  role: string;
  phone: string;
  email?: string;
}

export default function ProfileScreen({ navigation }: { navigation: any }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { logout, normalizeRole } = useAuth();

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setIsLoading(true);
      const currentUser = await userService.getCurrentUser();
      if (currentUser) {
        // Normalize the role to ensure consistency
        const normalizedUser = {
          ...currentUser,
          role: normalizeRole(currentUser.role)
        };
        setUser(normalizedUser);
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
    } finally {
      setIsLoading(false);
    }
  };



  const getRoleDisplay = (role: string) => {
    const normalizedRole = normalizeRole(role);
    switch (normalizedRole) {
      case 'PUBLIC':
        return { icon: 'user', label: 'Public User', color: '#10B981' };
      case 'AGENT':
        return { icon: 'building', label: 'Agent User', color: '#3B82F6' };
      case 'OWNER':
        return { icon: 'ship', label: 'Boat Owner', color: '#8B5CF6' };
      case 'APP_OWNER':
        return { icon: 'crown', label: 'Administrator', color: '#F59E0B' };
      default:
        return { icon: 'user', label: 'User', color: '#6B7280' };
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <FontAwesome5 name="spinner" size={24} color="#007AFF" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load user profile</Text>
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
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <FontAwesome5 name="user-circle" size={60} color="#007AFF" />
          </View>
          <Text style={styles.profileName}>{user.name}</Text>
          <View style={styles.roleContainer}>
            <FontAwesome5 name={roleInfo.icon} size={16} color={roleInfo.color} />
            <Text style={[styles.roleText, { color: roleInfo.color }]}>
              {roleInfo.label}
            </Text>
          </View>
        </View>

        {/* User Info */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <FontAwesome5 name="phone" size={16} color="#6B7280" />
              <Text style={styles.infoLabel}>Phone Number</Text>
              <Text style={styles.infoValue}>{user.phone}</Text>
            </View>
            
            {user.email && (
              <View style={styles.infoRow}>
                <FontAwesome5 name="envelope" size={16} color="#6B7280" />
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{user.email}</Text>
              </View>
            )}
            
            <View style={styles.infoRow}>
              <FontAwesome5 name="id-card" size={16} color="#6B7280" />
              <Text style={styles.infoLabel}>User ID</Text>
              <Text style={styles.infoValue}>#{user.id}</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Dashboard')}
            >
              <View style={styles.actionIcon}>
                <FontAwesome5 name="tachometer-alt" size={20} color="#007AFF" />
              </View>
              <Text style={styles.actionTitle}>Dashboard</Text>
            </TouchableOpacity>

            {user.role === 'OWNER' && (
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => navigation.navigate('MyBoats')}
              >
                <View style={styles.actionIcon}>
                  <FontAwesome5 name="ship" size={20} color="#007AFF" />
                </View>
                <Text style={styles.actionTitle}>My Boats</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('MyBookings')}
            >
              <View style={styles.actionIcon}>
                <FontAwesome5 name="list-alt" size={20} color="#007AFF" />
              </View>
              <Text style={styles.actionTitle}>My Bookings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Settings')}
            >
              <View style={styles.actionIcon}>
                <FontAwesome5 name="cog" size={20} color="#007AFF" />
              </View>
              <Text style={styles.actionTitle}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* App Info */}
        <View style={styles.appInfoSection}>
          <Text style={styles.sectionTitle}>App Information</Text>
          <View style={styles.appInfoCard}>
            <Text style={styles.appInfoText}>Nashath Booking v1.0.0</Text>
            <Text style={styles.appInfoText}>Speed Boat Ticketing System</Text>
          </View>
        </View>

        {/* Logout Section */}
        <View style={styles.logoutSection}>
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={async () => {
              console.log('🔄 ProfileScreen: Logout button pressed');
              try {
                await logout();
                console.log('🔄 ProfileScreen: Logout completed');
              } catch (error) {
                console.error('🔄 ProfileScreen: Logout error:', error);
                Alert.alert('Logout Error', 'Failed to logout. Please try again.');
              }
            }}
          >
            <FontAwesome5 name="sign-out-alt" size={20} color="#EF4444" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
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
    textAlign: 'center',
    flex: 1,
  },
  headerSpacer: {
    width: 40, // Same width for centering
  },

  profileCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  profileAvatar: {
    marginBottom: 16,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleText: {
    fontSize: 16,
    fontWeight: '600',
  },

  infoSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 12,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },

  actionsSection: {
    marginBottom: 24,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '48%',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },

  appInfoSection: {
    marginBottom: 24,
  },
  appInfoCard: {
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
  appInfoText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
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

  logoutSection: {
    marginTop: 24,
    alignItems: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
});
