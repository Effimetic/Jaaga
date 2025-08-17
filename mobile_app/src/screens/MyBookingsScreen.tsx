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

interface Booking {
  id: number;
  code: string;
  buyer_name: string;
  schedule_name: string;
  schedule_date: string;
  boat_name: string;
  grand_total: number;
  currency: string;
  payment_status: string;
  fulfillment_status: string;
  created_at: string;
}

export default function MyBookingsScreen({ navigation }: { navigation: any }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getBookings();
      if (response.success) {
        setBookings(response.data || response.bookings || []);
      } else {
        Alert.alert('Error', 'Failed to load bookings');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load bookings');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
      case 'confirmed':
        return '#10B981';
      case 'pending':
      case 'unconfirmed':
        return '#F59E0B';
      case 'cancelled':
      case 'failed':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
      case 'confirmed':
        return 'check-circle';
      case 'pending':
      case 'unconfirmed':
        return 'clock';
      case 'cancelled':
      case 'failed':
        return 'times-circle';
      default:
        return 'question-circle';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const renderBookingCard = ({ item }: { item: Booking }) => (
    <TouchableOpacity
      style={styles.bookingCard}
      onPress={() => {
        Alert.alert(
          'Booking Details',
          `Booking Code: ${item.code}\nStatus: ${item.fulfillment_status}\nAmount: ${item.currency} ${item.grand_total}`
        );
      }}
    >
      <View style={styles.bookingHeader}>
        <View style={styles.bookingInfo}>
          <Text style={styles.bookingCode}>{item.code}</Text>
          <Text style={styles.bookingSchedule}>{item.schedule_name}</Text>
          <Text style={styles.bookingDate}>{formatDate(item.schedule_date)}</Text>
        </View>
        <View style={styles.bookingStatus}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.fulfillment_status) }
          ]}>
            <FontAwesome5 
              name={getStatusIcon(item.fulfillment_status)} 
              size={12} 
              color="#FFF" 
            />
            <Text style={styles.statusText}>
              {item.fulfillment_status.charAt(0).toUpperCase() + item.fulfillment_status.slice(1)}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.bookingDetails}>
        <View style={styles.detailRow}>
          <FontAwesome5 name="ship" size={14} color="#6B7280" />
          <Text style={styles.detailText}>{item.boat_name}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <FontAwesome5 name="user" size={14} color="#6B7280" />
          <Text style={styles.detailText}>{item.buyer_name}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <FontAwesome5 name="money-bill" size={14} color="#6B7280" />
          <Text style={styles.detailText}>{item.currency} {item.grand_total}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <FontAwesome5 name="ticket-alt" size={48} color="#9CA3AF" />
      </View>
      <Text style={styles.emptyTitle}>No Bookings Yet</Text>
      <Text style={styles.emptyDescription}>
        You haven't made any bookings yet. Start by searching for available schedules!
      </Text>
      <TouchableOpacity
        style={styles.emptyActionBtn}
        onPress={() => navigation.navigate('Schedules')}
      >
        <FontAwesome5 name="search" size={16} color="#FFF" />
        <Text style={styles.emptyActionText}>Find Schedules</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <FontAwesome5 name="spinner" size={24} color="#007AFF" />
          <Text style={styles.loadingText}>Loading bookings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.pageHeader}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <FontAwesome5 name="arrow-left" size={20} color="#007AFF" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.pageTitle}>My Bookings</Text>
            <Text style={styles.pageSubtitle}>View your booking history</Text>
          </View>
        </View>
      </View>

      {/* Stats Summary */}
      <View style={styles.statsSummary}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{bookings.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {bookings.filter(b => b.fulfillment_status === 'confirmed').length}
          </Text>
          <Text style={styles.statLabel}>Confirmed</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {bookings.filter(b => b.payment_status === 'pending').length}
          </Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
      </View>

      {/* Bookings List */}
      {bookings.length > 0 ? (
        <FlatList
          data={bookings}
          renderItem={renderBookingCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.bookingsList}
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
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    padding: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
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

  bookingsList: {
    padding: 16,
    gap: 12,
  },

  bookingCard: {
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
  bookingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingCode: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  bookingSchedule: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 2,
  },
  bookingDate: {
    fontSize: 13,
    color: '#6B7280',
  },
  bookingStatus: {
    marginLeft: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFF',
  },

  bookingDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
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