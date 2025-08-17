import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  SafeAreaView,
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
  is_active: boolean;
  created_at: string;
}

export default function MyBoatsScreen({ navigation }: { navigation: any }) {
  const [boats, setBoats] = useState<Boat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBoats();
  }, []);

  const loadBoats = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getBoats();
      if (response.success) {
        setBoats(response.data);
      } else {
        Alert.alert('Error', response.error || 'Failed to load boats');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load boats');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBoat = (boatId: number, boatName: string) => {
    Alert.alert(
      'Delete Boat',
      `Are you sure you want to delete "${boatName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiService.deleteBoat(boatId);
              if (response.success) {
                Alert.alert('Success', 'Boat deleted successfully');
                loadBoats(); // Reload the list
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
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const renderBoatCard = ({ item }: { item: Boat }) => (
    <View style={styles.boatCard}>
      <View style={styles.boatHeader}>
        <View style={styles.boatInfo}>
          <Text style={styles.boatName}>{item.name}</Text>
          <View style={styles.boatMeta}>
            <View style={styles.metaItem}>
              <FontAwesome5 name="chair" size={12} color="#6B7280" />
              <Text style={styles.metaText}>
                {item.seating_type === 'total' 
                  ? `${item.total_seats} seats`
                  : 'Chart-based'
                }
              </Text>
            </View>
            <View style={styles.metaItem}>
              <FontAwesome5 name="calendar" size={12} color="#6B7280" />
              <Text style={styles.metaText}>
                {formatDate(item.created_at)}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.boatStatus}>
          <View style={[
            styles.statusBadge,
            item.is_active ? styles.statusActive : styles.statusInactive
          ]}>
            <Text style={styles.statusText}>
              {item.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.boatActions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionPrimary]}
          onPress={() => navigation.navigate('ViewBoat', { boatId: item.id })}
        >
          <FontAwesome5 name="eye" size={14} color="#FFF" />
          <Text style={styles.actionText}>View</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionSecondary]}
          onPress={() => navigation.navigate('EditBoat', { boatId: item.id })}
        >
          <FontAwesome5 name="edit" size={14} color="#007AFF" />
          <Text style={[styles.actionText, styles.actionTextSecondary]}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionDanger]}
          onPress={() => handleDeleteBoat(item.id, item.name)}
        >
          <FontAwesome5 name="trash" size={14} color="#FFF" />
          <Text style={styles.actionText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <FontAwesome5 name="ship" size={48} color="#9CA3AF" />
      </View>
      <Text style={styles.emptyTitle}>No Boats Yet</Text>
      <Text style={styles.emptyDescription}>
        You haven't added any boats yet. Start by adding your first boat to your fleet!
      </Text>
      <TouchableOpacity
        style={styles.emptyActionBtn}
        onPress={() => navigation.navigate('AddBoat')}
      >
        <FontAwesome5 name="plus" size={16} color="#FFF" />
        <Text style={styles.emptyActionText}>Add Your First Boat</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <FontAwesome5 name="spinner" size={24} color="#007AFF" />
          <Text style={styles.loadingText}>Loading boats...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Page Header */}
      <View style={styles.pageHeader}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <FontAwesome5 name="arrow-left" size={20} color="#007AFF" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.pageTitle}>My Boats</Text>
            <Text style={styles.pageSubtitle}>Manage your boat fleet</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('AddBoat')}
        >
          <FontAwesome5 name="plus" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Stats Summary */}
      <View style={styles.statsSummary}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{boats.length}</Text>
          <Text style={styles.statLabel}>Total Boats</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {boats.filter(boat => boat.is_active).length}
          </Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {boats.filter(boat => !boat.is_active).length}
          </Text>
          <Text style={styles.statLabel}>Inactive</Text>
        </View>
      </View>

      {/* Boats List */}
      {boats.length > 0 ? (
        <FlatList
          data={boats}
          renderItem={renderBoatCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.boatsList}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        renderEmptyState()
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FA' },

  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  statsSummary: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statItem: {
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
  statNumber: {
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

  boatsList: {
    padding: 16,
    gap: 12,
  },

  boatCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  boatHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  boatInfo: {
    flex: 1,
  },
  boatName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  boatMeta: {
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: '#6B7280',
  },
  boatStatus: {
    marginLeft: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
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

  boatActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  actionPrimary: {
    backgroundColor: '#007AFF',
  },
  actionSecondary: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  actionDanger: {
    backgroundColor: '#EF4444',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  actionTextSecondary: {
    color: '#007AFF',
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  emptyActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
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
});
