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

interface Boat {
  id: number;
  name: string;
  seating_type: string;
  total_seats: number;
  seating_chart: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function ViewBoatScreen({ navigation, route }: { navigation: any; route: any }) {
  const [boat, setBoat] = useState<Boat | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { boatId } = route.params || {};

  useEffect(() => {
    loadBoat();
  }, [boatId]);

  const loadBoat = async () => {
    try {
      setIsLoading(true);
      
      if (!boatId) {
        Alert.alert('Error', 'No boat selected');
        navigation.goBack();
        return;
      }

      const response = await apiService.getBoatById(boatId);
      if (response.success) {
        setBoat(response.data);
      } else {
        Alert.alert('Error', 'Failed to load boat details');
        navigation.goBack();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load boat');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBoat = () => {
    if (!boat) return;

    Alert.alert(
      'Delete Boat',
      `Are you sure you want to delete "${boat.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiService.deleteBoat(boat.id);
              if (response.success) {
                Alert.alert('Success', 'Boat deleted successfully');
                navigation.goBack();
              } else {
                Alert.alert('Error', response.error || 'Failed to delete boat');
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete boat');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <FontAwesome5 name="spinner" size={24} color="#007AFF" />
          <Text style={styles.loadingText}>Loading boat details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!boat) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Boat not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <FontAwesome5 name="arrow-left" size={20} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{boat.name}</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('EditBoat', { boatId: boat.id })}
          >
            <FontAwesome5 name="edit" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusIcon}>
            <FontAwesome5 name="ship" size={24} color="#FFF" />
          </View>
          <View style={styles.statusInfo}>
            <View style={[
              styles.statusBadge,
              boat.is_active ? styles.statusActive : styles.statusInactive
            ]}>
              <Text style={styles.statusText}>
                {boat.is_active ? 'Active' : 'Inactive'}
              </Text>
            </View>
            <Text style={styles.statusDescription}>
              {boat.is_active 
                ? 'This boat is currently active and available for schedules'
                : 'This boat is currently inactive and cannot be scheduled'
              }
            </Text>
          </View>
        </View>

        {/* Boat Details */}
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Boat Information</Text>
          
          <View style={styles.detailsGrid}>
            <View style={styles.detailCard}>
              <View style={styles.detailIcon}>
                <FontAwesome5 name="tag" size={16} color="#6B7280" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Boat Name</Text>
                <Text style={styles.detailValue}>{boat.name}</Text>
              </View>
            </View>

            <View style={styles.detailCard}>
              <View style={styles.detailIcon}>
                <FontAwesome5 name="chair" size={16} color="#6B7280" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Seating Type</Text>
                <Text style={styles.detailValue}>
                  {boat.seating_type === 'total' ? 'Total Seat Count' : 'Seat Chart'}
                </Text>
              </View>
            </View>

            <View style={styles.detailCard}>
              <View style={styles.detailIcon}>
                <FontAwesome5 name="users" size={16} color="#6B7280" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Total Seats</Text>
                <Text style={styles.detailValue}>{boat.total_seats}</Text>
              </View>
            </View>

            <View style={styles.detailCard}>
              <View style={styles.detailIcon}>
                <FontAwesome5 name="calendar" size={16} color="#6B7280" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Created</Text>
                <Text style={styles.detailValue}>{formatDate(boat.created_at)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('EditBoat', { boatId: boat.id })}
            >
              <View style={styles.actionIcon}>
                <FontAwesome5 name="edit" size={20} color="#007AFF" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Edit Boat</Text>
                <Text style={styles.actionSubtitle}>Modify boat details and settings</Text>
              </View>
              <View style={styles.actionArrow}>
                <FontAwesome5 name="chevron-right" size={16} color="#9CA3AF" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Schedules')}
            >
              <View style={styles.actionIcon}>
                <FontAwesome5 name="calendar-plus" size={20} color="#007AFF" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Create Schedule</Text>
                <Text style={styles.actionSubtitle}>Schedule trips for this boat</Text>
              </View>
              <View style={styles.actionArrow}>
                <FontAwesome5 name="chevron-right" size={16} color="#9CA3AF" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('MyBoats')}
            >
              <View style={styles.actionIcon}>
                <FontAwesome5 name="list" size={20} color="#007AFF" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>View All Boats</Text>
                <Text style={styles.actionSubtitle}>Back to boat management</Text>
              </View>
              <View style={styles.actionArrow}>
                <FontAwesome5 name="chevron-right" size={16} color="#9CA3AF" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, styles.dangerCard]}
              onPress={handleDeleteBoat}
            >
              <View style={[styles.actionIcon, styles.dangerIcon]}>
                <FontAwesome5 name="trash" size={20} color="#EF4444" />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, styles.dangerText]}>Delete Boat</Text>
                <Text style={styles.actionSubtitle}>Permanently remove this boat</Text>
              </View>
              <View style={styles.actionArrow}>
                <FontAwesome5 name="chevron-right" size={16} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          </View>
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
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  titleSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },

  statusCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statusIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  statusInfo: {
    flex: 1,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  statusActive: {
    backgroundColor: '#10B981',
  },
  statusInactive: {
    backgroundColor: '#6B7280',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  statusDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },

  detailsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },

  actionsSection: {
    marginBottom: 24,
  },
  actionsGrid: {
    gap: 12,
  },
  actionCard: {
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
  dangerCard: {
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  dangerIcon: {
    backgroundColor: '#FEE2E2',
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  dangerText: {
    color: '#EF4444',
  },
  actionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  actionArrow: {
    marginLeft: 8,
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