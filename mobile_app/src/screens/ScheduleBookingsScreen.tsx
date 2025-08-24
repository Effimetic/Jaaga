import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { apiService } from '../services/apiService';

interface Booking {
  id: number;
  booking_ref: string;
  customer_type: string;
  price_type: string;
  total_amount: number;
  currency: string;
  contact_name: string;
  contact_phone: string;
  seats: Array<{
    id: number;
    seat_number: string;
  }>;
  created_at: string;
}

interface Schedule {
  id: number;
  name: string;
  schedule_date: string;
  boat: {
    name: string;
  };
}

export default function ScheduleBookingsScreen({ navigation, route }: { navigation: any; route: any }) {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'public' | 'agent'>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);

  const { scheduleId } = route.params || {};

  useEffect(() => {
    loadData();
  }, [scheduleId]);

  useEffect(() => {
    filterBookings();
  }, [bookings, searchQuery, filterType]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      if (!scheduleId) {
        Alert.alert('Error', 'No schedule selected');
        navigation.goBack();
        return;
      }

      const [scheduleResponse, bookingsResponse] = await Promise.all([
        apiService.getScheduleById(scheduleId),
        apiService.getScheduleBookings(scheduleId)
      ]);
      
      if (scheduleResponse.success) {
        setSchedule(scheduleResponse.data);
      }

      if (bookingsResponse.success) {
        setBookings(bookingsResponse.data || []);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load bookings');
    } finally {
      setIsLoading(false);
    }
  };

  const filterBookings = () => {
    let filtered = bookings;

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(booking => booking.customer_type === filterType);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(booking => 
        booking.booking_ref.toLowerCase().includes(query) ||
        booking.contact_name.toLowerCase().includes(query) ||
        booking.contact_phone.includes(query)
      );
    }

    setFilteredBookings(filtered);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCustomerTypeColor = (type: string) => {
    switch (type) {
      case 'public':
        return '#10B981';
      case 'agent':
        return '#3B82F6';
      default:
        return '#6B7280';
    }
  };

  const getPriceTypeColor = (type: string) => {
    switch (type) {
      case 'priced':
        return '#10B981';
      case 'complimentary':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  };

  const renderBookingCard = ({ item }: { item: Booking }) => (
    <TouchableOpacity
      style={styles.bookingCard}
      onPress={() => navigation.navigate('ViewBooking', { bookingId: item.id })}
    >
      <View style={styles.bookingHeader}>
        <View style={styles.bookingInfo}>
          <Text style={styles.bookingRef}>{item.booking_ref}</Text>
          <Text style={styles.bookingCustomer}>{item.contact_name}</Text>
          <Text style={styles.bookingPhone}>{item.contact_phone}</Text>
        </View>
        <View style={styles.bookingMeta}>
          <View style={[
            styles.typeBadge,
            { backgroundColor: getCustomerTypeColor(item.customer_type) }
          ]}>
            <Text style={styles.typeBadgeText}>
              {item.customer_type.charAt(0).toUpperCase() + item.customer_type.slice(1)}
            </Text>
          </View>
          <Text style={styles.bookingAmount}>
            {item.currency} {item.total_amount.toFixed(2)}
          </Text>
        </View>
      </View>
      
      <View style={styles.bookingDetails}>
        <View style={styles.detailRow}>
          <FontAwesome5 name="chair" size={14} color="#6B7280" />
          <Text style={styles.detailText}>
            Seats: {item.seats.map(s => s.seat_number).join(', ')}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <FontAwesome5 name="tag" size={14} color="#6B7280" />
          <Text style={styles.detailText}>
            {item.price_type === 'priced' ? 'Paid Booking' : 'Complimentary'}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <FontAwesome5 name="calendar" size={14} color="#6B7280" />
          <Text style={styles.detailText}>
            Booked: {formatDate(item.created_at)}
          </Text>
        </View>
      </View>

      <View style={styles.bookingActions}>
        <TouchableOpacity
          style={styles.viewBtn}
          onPress={() => navigation.navigate('ViewBooking', { bookingId: item.id })}
        >
          <FontAwesome5 name="eye" size={12} color="#007AFF" />
          <Text style={styles.viewBtnText}>View Details</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.ticketBtn}
          onPress={() => navigation.navigate('IssueTicket', { bookingId: item.id })}
        >
          <FontAwesome5 name="ticket-alt" size={12} color="#10B981" />
          <Text style={styles.ticketBtnText}>Issue Ticket</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <FontAwesome5 name="ticket-alt" size={48} color="#9CA3AF" />
      <Text style={styles.emptyTitle}>No Bookings Found</Text>
      <Text style={styles.emptyDescription}>
        {searchQuery || filterType !== 'all' 
          ? 'No bookings match your current filters'
          : 'No bookings have been made for this schedule yet'
        }
      </Text>
      {(!searchQuery && filterType === 'all') && (
        <TouchableOpacity
          style={styles.createBookingBtn}
          onPress={() => navigation.navigate('CreateBooking', { scheduleId })}
        >
          <FontAwesome5 name="plus" size={16} color="#FFF" />
          <Text style={styles.createBookingText}>Create First Booking</Text>
        </TouchableOpacity>
      )}
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
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <FontAwesome5 name="arrow-left" size={20} color="#007AFF" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Schedule Bookings</Text>
          <Text style={styles.headerSubtitle}>
            {schedule?.name} • {schedule && new Date(schedule.schedule_date).toLocaleDateString()}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <FontAwesome5 name="filter" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <FontAwesome5 name="search" size={16} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by booking ref, name, or phone..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearSearchButton}
              onPress={() => setSearchQuery('')}
            >
              <FontAwesome5 name="times" size={14} color="#6B7280" />
            </TouchableOpacity>
          )}
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
            {bookings.filter(b => b.customer_type === 'public').length}
          </Text>
          <Text style={styles.statLabel}>Public</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {bookings.filter(b => b.customer_type === 'agent').length}
          </Text>
          <Text style={styles.statLabel}>Agent</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            MVR {bookings.reduce((sum, b) => sum + b.total_amount, 0).toFixed(0)}
          </Text>
          <Text style={styles.statLabel}>Revenue</Text>
        </View>
      </View>

      {/* Bookings List */}
      {filteredBookings.length > 0 ? (
        <FlatList
          data={filteredBookings}
          renderItem={renderBookingCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.bookingsList}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        renderEmptyState()
      )}

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowFilterModal(false)}
            >
              <FontAwesome5 name="times" size={20} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Filter Bookings</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.filterSectionTitle}>Customer Type</Text>
            
            <TouchableOpacity
              style={[
                styles.filterOption,
                filterType === 'all' && styles.selectedFilterOption
              ]}
              onPress={() => setFilterType('all')}
            >
              <FontAwesome5 name="globe" size={16} color={filterType === 'all' ? "#007AFF" : "#6B7280"} />
              <Text style={[
                styles.filterOptionText,
                filterType === 'all' && styles.selectedFilterOptionText
              ]}>
                All Bookings
              </Text>
              {filterType === 'all' && (
                <FontAwesome5 name="check" size={16} color="#007AFF" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterOption,
                filterType === 'public' && styles.selectedFilterOption
              ]}
              onPress={() => setFilterType('public')}
            >
              <FontAwesome5 name="user" size={16} color={filterType === 'public' ? "#007AFF" : "#6B7280"} />
              <Text style={[
                styles.filterOptionText,
                filterType === 'public' && styles.selectedFilterOptionText
              ]}>
                Public Bookings
              </Text>
              {filterType === 'public' && (
                <FontAwesome5 name="check" size={16} color="#007AFF" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterOption,
                filterType === 'agent' && styles.selectedFilterOption
              ]}
              onPress={() => setFilterType('agent')}
            >
              <FontAwesome5 name="user-tie" size={16} color={filterType === 'agent' ? "#007AFF" : "#6B7280"} />
              <Text style={[
                styles.filterOptionText,
                filterType === 'agent' && styles.selectedFilterOptionText
              ]}>
                Agent Bookings
              </Text>
              {filterType === 'agent' && (
                <FontAwesome5 name="check" size={16} color="#007AFF" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.applyFilterButton}
              onPress={() => setShowFilterModal(false)}
            >
              <FontAwesome5 name="check" size={16} color="#FFF" />
              <Text style={styles.applyFilterText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FA' },

  header: {
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  filterButton: {
    padding: 8,
  },

  searchContainer: {
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#111827',
  },
  clearSearchButton: {
    padding: 4,
  },

  statsSummary: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
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
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingRef: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  bookingCustomer: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 2,
  },
  bookingPhone: {
    fontSize: 13,
    color: '#6B7280',
  },
  bookingMeta: {
    alignItems: 'flex-end',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFF',
  },
  bookingAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },

  bookingDetails: {
    gap: 6,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#374151',
    flex: 1,
  },

  bookingActions: {
    flexDirection: 'row',
    gap: 8,
  },
  viewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  viewBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  ticketBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  ticketBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
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
  createBookingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  createBookingText: {
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

  // Modal styles
  modalSafe: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  placeholder: { width: 36 },
  modalContent: {
    flex: 1,
    padding: 16,
  },

  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    gap: 12,
  },
  selectedFilterOption: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F9FF',
  },
  filterOptionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  selectedFilterOptionText: {
    color: '#007AFF',
  },
  applyFilterButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  applyFilterText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});