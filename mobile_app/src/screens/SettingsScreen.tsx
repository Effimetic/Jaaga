import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

interface User {
  id: number;
  name: string;
  role: string;
  phone: string;
}

export default function SettingsScreen({ navigation }: { navigation: any }) {
  const { user, normalizeRole, logout } = useAuth();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  console.log('🔍 SettingsScreen: AuthContext user:', user);
  console.log('🔍 SettingsScreen: Current user state:', currentUser);

  useEffect(() => {
    if (user) {
      console.log('🔍 SettingsScreen: Setting current user from auth context:', user);
      setCurrentUser(user);
    }
  }, [user]);

  const settingsOptions = [
    {
      title: 'Account Settings',
      subtitle: 'Manage your account information',
      icon: 'user-cog',
      color: '#007AFF',
      onPress: () => navigation.navigate('Profile'),
    },
    {
      title: 'Notifications',
      subtitle: 'Configure notification preferences',
      icon: 'bell',
      color: '#10B981',
      onPress: () => {
        // TODO: Implement notifications settings
        console.log('Notifications settings');
      },
    },
    {
      title: 'Privacy & Security',
      subtitle: 'Manage privacy and security settings',
      icon: 'shield-alt',
      color: '#F59E0B',
      onPress: () => {
        // TODO: Implement privacy settings
        console.log('Privacy settings');
      },
    },
    {
      title: 'Help & Support',
      subtitle: 'Get help and contact support',
      icon: 'question-circle',
      color: '#8B5CF6',
      onPress: () => {
        // TODO: Implement help and support
        console.log('Help and support');
      },
    },
  ];

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <FontAwesome5 name="spinner" size={24} color="#007AFF" />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const normalizedRole = normalizeRole(currentUser.role);
  const roleDisplay = getRoleDisplay(normalizedRole);

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
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.placeholder} />
        </View>

        {/* User Info Card */}
        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            <FontAwesome5 name="user-circle" size={50} color="#007AFF" />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{currentUser.name}</Text>
            <View style={styles.roleContainer}>
              <FontAwesome5 name={roleDisplay.icon} size={14} color={roleDisplay.color} />
              <Text style={[styles.userRole, { color: roleDisplay.color }]}>
                {roleDisplay.label}
              </Text>
            </View>
            <Text style={styles.userPhone}>{currentUser.phone}</Text>
          </View>
        </View>

        {/* Settings Options */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.optionsList}>
            {settingsOptions.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.optionCard}
                onPress={option.onPress}
              >
                <View style={styles.optionIcon}>
                  <FontAwesome5 name={option.icon} size={20} color={option.color} />
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                </View>
                <View style={styles.optionArrow}>
                  <FontAwesome5 name="chevron-right" size={16} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Logout Section */}
        <View style={styles.logoutSection}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={async () => {
              try {
                await logout();
              } catch (error) {
                console.error('Logout error:', error);
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

const getRoleDisplay = (role: string) => {
  switch (role) {
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

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  container: {
    padding: 16,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  placeholder: { width: 36 },

  userCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  userAvatar: {
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  userRole: {
    fontSize: 14,
    fontWeight: '600',
  },
  userPhone: {
    fontSize: 14,
    color: '#6B7280',
  },

  settingsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  optionsList: {
    gap: 12,
  },
  optionCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: 14,
    color: '#6B7280',
  },
  optionArrow: {
    marginLeft: 16,
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

  logoutSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    gap: 12,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
});