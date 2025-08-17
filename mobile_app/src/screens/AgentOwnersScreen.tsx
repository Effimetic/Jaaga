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

interface Owner {
  id: number;
  name: string;
  phone: string;
  credit_limit: number;
  current_balance: number;
  currency: string;
}

export default function AgentOwnersScreen({ navigation }: { navigation: any }) {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOwners();
  }, []);

  const loadOwners = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getAgentOwners();
      if (response.success) {
        setOwners(response.data || []);
      } else {
        Alert.alert('Error', response.error || 'Failed to load connected owners');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load connected owners');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOwnerPress = (owner: Owner) => {
    // Navigate to owner's schedules
    navigation.navigate('Schedules', { 
      ownerId: owner.id,
      ownerName: owner.name 
    });
  };

  const renderOwnerCard = ({ item }: { item: Owner }) => (
    <TouchableOpacity
      style={styles.ownerCard}
      onPress={() => handleOwnerPress(item)}
    >
      <View style={styles.ownerHeader}>
        <View style={styles.ownerInfo}>
          <Text style={styles.ownerName}>{item.name}</Text>
          <Text style={styles.ownerPhone}>{item.phone}</Text>
        </View>
        <View style={styles.creditInfo}>
          <Text style={styles.creditLabel}>Credit Limit</Text>
          <Text style={styles.creditAmount}>
            {item.currency} {item.credit_limit.toFixed(2)}
          </Text>
        </View>
      </View>
      
      <View style={styles.balanceInfo}>
        <View style={styles.balanceItem}>
          <Text style={styles.balanceLabel}>Current Balance</Text>
          <Text style={[
            styles.balanceAmount,
            { color: item.current_balance > 0 ? '#EF4444' : '#10B981' }
          ]}>
            {item.currency} {Math.abs(item.current_balance).toFixed(2)}
            {item.current_balance > 0 ? ' (Owed)' : ' (Credit)'}
          </Text>
        </View>
        
        <View style={styles.availableCredit}>
          <Text style={styles.balanceLabel}>Available Credit</Text>
          <Text style={styles.balanceAmount}>
            {item.currency} {(item.credit_limit - item.current_balance).toFixed(2)}
          </Text>
        </View>
      </View>

      <View style={styles.actionButton}>
        <FontAwesome5 name="calendar" size={14} color="#FFF" />
        <Text style={styles.actionButtonText}>View Schedules</Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <FontAwesome5 name="handshake" size={48} color="#9CA3AF" />
      </View>
      <Text style={styles.emptyTitle}>No Connected Owners</Text>
      <Text style={styles.emptyDescription}>
        You don't have any connections with boat owners yet. Contact boat owners to establish credit connections.
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <FontAwesome5 name="spinner" size={24} color="#007AFF" />
          <Text style={styles.loadingText}>Loading connected owners...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.pageHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <FontAwesome5 name="arrow-left" size={20} color="#007AFF" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.pageTitle}>Connected Owners</Text>
          <Text style={styles.pageSubtitle}>Boat owners you can book from</Text>
        </View>
      </View>

      {/* Stats Summary */}
      <View style={styles.statsSummary}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{owners.length}</Text>
          <Text style={styles.statLabel}>Connected</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {owners.filter(o => o.current_balance <= o.credit_limit).length}
          </Text>
          <Text style={styles.statLabel}>Good Standing</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            MVR {owners.reduce((sum, o) => sum + (o.credit_limit - o.current_balance), 0).toFixed(0)}
          </Text>
          <Text style={styles.statLabel}>Available Credit</Text>
        </View>
      </View>

      {/* Owners List */}
      {owners.length > 0 ? (
        <FlatList
          data={owners}
          renderItem={renderOwnerCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.ownersList}
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
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
  },

  ownersList: {
    padding: 16,
    gap: 12,
  },

  ownerCard: {
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
  ownerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  ownerInfo: {
    flex: 1,
  },
  ownerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  ownerPhone: {
    fontSize: 14,
    color: '#6B7280',
  },
  creditInfo: {
    alignItems: 'flex-end',
  },
  creditLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  creditAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },

  balanceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  balanceItem: {
    flex: 1,
  },
  availableCredit: {
    flex: 1,
    alignItems: 'flex-end',
  },
  balanceLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },

  actionButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
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