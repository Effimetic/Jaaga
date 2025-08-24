import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { apiService } from '../services/apiService';

interface Schedule {
  id: number;
  name: string;
  schedule_date: string;
  boat: {
    id: number;
    name: string;
    total_seats: number;
    seating_type: string;
  };
  total_seats: number;
  available_seats: number;
  status: string;
  confirmation_type: string;
  is_public: boolean;
  destinations: Array<{
    id: number;
    island_name: string;
    sequence_order: number;
    departure_time?: string;
    arrival_time?: string;
    is_pickup: boolean;
    is_dropoff: boolean;
  }>;
  created_at: string;
}

interface Booking {
  id: number;
  booking_ref: string;
  customer_type: string;
  contact_name: string;
  contact_phone: string;
  total_amount: number;
  currency: string;
  seats: Array<{
    seat_number: string;
  }>;
  created_at: string;
}

export default function ViewScheduleScreen({ navigation, route }: { navigation: any; route: any }) {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'bookings'>('details');

  const { scheduleId } = route.params || {};

  useEffect(() => {
    loadScheduleData();
  }, [scheduleId]);

  const loadScheduleData = async () => {
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
      } else {
        Alert.alert('Error', 'Failed to load schedule details');
        navigation.goBack();
      }

      if (bookingsResponse.success) {
        setBookings(bookingsResponse.data || []);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load schedule');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSchedule = () => {
    if (!schedule) return;

    Alert.alert(
      'Delete Schedule',
      `Are you sure you want to delete "${schedule.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiService.deleteSchedule(schedule.id);
              if (response.success) {
                Alert.alert('Success', 'Schedule deleted successfully');
                navigation.goBack();
              } else {
                Alert.alert('Error', response.error || 'Failed to delete schedule');
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete schedule');
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

  const formatTime = (timeString?: string) => {
    if (!timeString) return 'TBD';
    return timeString;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'published':
        return '#10B981';
      case 'draft':
        return '#F59E0B';
      case 'cancelled':
        return '#EF4444';
      case 'completed':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const renderBookingCard = ({ item }: { item: Booking }) => (
    <View style={styles.bookingCard}>
      <View style={styles.bookingHeader}>
        <View style={styles.bookingInfo}>
          <Text style={styles.bookingRef}>{item.booking_ref}</Text>
          <Text style={styles.bookingCustomer}>{item.contact_name}</Text>
          <Text style={styles.bookingPhone}>{item.contact_phone}</Text>
        </View>
        <View style={styles.bookingAmount}>
          <Text style={styles.amountText}>
            {item.currency} {item.total_amount.toFixed(2)}
          </Text>
          <Text style={styles.customerType}>
            {item.customer_type === 'public' ? 'Public' : 'Agent'}
          </Text>
        </View>
      </View>
      
      <View style={styles.bookingSeats}>
        <FontAwesome5 name="chair" size={14} color="#6B7280" />
        <Text style={styles.seatsText}>
          Seats: {item.seats.map(s => s.seat_number).join(', ')}
        </Text>
      </View>
      
      <View style={styles.bookingFooter}>
        <Text style={styles.bookingDate}>
          Booked: {new Date(item.created_at).toLocaleDateString()}
        </Text>
        <TouchableOpacity
          style={styles.viewBookingBtn}
          onPress={() => navigation.navigate('ViewBooking', { bookingId: item.id })}
        >
          <FontAwesome5 name="eye" size={12} color="#007AFF" />
          <Text style={styles.viewBookingText}>View</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <FontAwesome5 name="spinner" size={24} color="#007AFF" />
          <Text style={styles.loadingText}>Loading schedule...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!schedule) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Schedule not found</Text>
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
          <Text style={styles.headerTitle}>{schedule.name}</Text>
          <Text style={styles.headerSubtitle}>{formatDate(schedule.schedule_date)}</Text>
        </View>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('EditSchedule', { scheduleId: schedule.id })}
        >
          <FontAwesome5 name="edit" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Status Card */}
      <View style={styles.statusCard}>
        <View style={styles.statusIcon}>
          <FontAwesome5 name="calendar-check" size={24} color="#FFF" />
        </View>
        <View style={styles.statusInfo}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(schedule.status) }
          ]}>
            <Text style={styles.statusText}>
              {schedule.status.charAt(0).toUpperCase() + schedule.status.slice(1)}
            </Text>
          </View>
          <Text style={styles.statusDescription}>
            {schedule.status === 'published' 
              ? 'This schedule is live and accepting bookings'
              : schedule.status === 'draft'
              ? 'This schedule is in draft mode'
              : 'This schedule has been cancelled'
            }
          </Text>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'details' && styles.activeTab]}
          onPress={() => setActiveTab('details')}
        >
          <Text style={[styles.tabText, activeTab === 'details' && styles.activeTabText]}>
            Details
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'bookings' && styles.activeTab]}
          onPress={() => setActiveTab('bookings')}
        >
          <Text style={[styles.tabText, activeTab === 'bookings' && styles.activeTabText]}>
            Bookings ({bookings.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <ScrollView style={styles.content}>
        {activeTab === 'details' ? (
          <View style={styles.detailsContent}>
            {/* Schedule Info */}
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Schedule Information</Text>
              
              <View style={styles.infoGrid}>
                <View style={styles.infoCard}>
                  <FontAwesome5 name="ship" size={16} color="#6B7280" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Boat</Text>
                    <Text style={styles.infoValue}>{schedule.boat.name}</Text>
                  </View>
                </View>

                <View style={styles.infoCard}>
                  <FontAwesome5 name="chair" size={16} color="#6B7280" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Seats</Text>
                    <Text style={styles.infoValue}>
                      {schedule.available_seats} / {schedule.total_seats}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoCard}>
                  <FontAwesome5 name="cog" size={16} color="#6B7280" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Confirmation</Text>
                    <Text style={styles.infoValue}>
                      {schedule.confirmation_type === 'immediate' ? 'Immediate' : 'Manual'}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoCard}>
                  <FontAwesome5 name="eye" size={16} color="#6B7280" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Visibility</Text>
                    <Text style={styles.infoValue}>
                      {schedule.is_public ? 'Public' : 'Private'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Destinations */}
            <View style={styles.destinationsSection}>
              <Text style={styles.sectionTitle}>Route & Destinations</Text>
              
              {schedule.destinations
                .sort((a, b) => a.sequence_order - b.sequence_order)
                .map((destination, index) => (
                <View key={destination.id} style={styles.destinationCard}>
                  <View style={styles.destinationHeader}>
                    <View style={styles.destinationNumber}>
                      <Text style={styles.destinationNumberText}>{index + 1}</Text>
                    </View>
                    <View style={styles.destinationInfo}>
                      <Text style={styles.destinationName}>{destination.island_name}</Text>
                      <View style={styles.destinationTimes}>
                        {destination.departure_time && (
                          <Text style={styles.timeText}>
                            Dep: {formatTime(destination.departure_time)}
                          </Text>
                        )}
                        {destination.arrival_time && (
                          <Text style={styles.timeText}>
                            Arr: {formatTime(destination.arrival_time)}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.destinationTypes}>
                      {destination.is_pickup && (
                        <View style={styles.typeBadge}>
                          <Text style={styles.typeBadgeText}>Pickup</Text>
                        </View>
                      )}
                      {destination.is_dropoff && (
                        <View style={styles.typeBadge}>
                          <Text style={styles.typeBadgeText}>Dropoff</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {/* Quick Actions */}
            <View style={styles.actionsSection}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              
              <View style={styles.actionsGrid}>
                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => navigation.navigate('EditSchedule', { scheduleId: schedule.id })}
                >
                  <View style={styles.actionIcon}>
                    <FontAwesome5 name="edit" size={20} color="#007AFF" />
                  </View>
                  <View style={styles.actionContent}>
                    <Text style={styles.actionTitle}>Edit Schedule</Text>
                    <Text style={styles.actionSubtitle}>Modify schedule details</Text>
                  </View>
                  <FontAwesome5 name="chevron-right" size={16} color="#9CA3AF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => navigation.navigate('CreateBooking', { scheduleId: schedule.id })}
                >
                  <View style={styles.actionIcon}>
                    <FontAwesome5 name="plus" size={20} color="#007AFF" />
                  </View>
                  <View style={styles.actionContent}>
                    <Text style={styles.actionTitle}>New Booking</Text>
                    <Text style={styles.actionSubtitle}>Create a new booking</Text>
                  </View>
                  <FontAwesome5 name="chevron-right" size={16} color="#9CA3AF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => navigation.navigate('ScheduleBookings', { scheduleId: schedule.id })}
                >
                  <View style={styles.actionIcon}>
                    <FontAwesome5 name="list" size={20} color="#007AFF" />
                  </View>
                  <View style={styles.actionContent}>
                    <Text style={styles.actionTitle}>Manage Bookings</Text>
                    <Text style={styles.actionSubtitle}>View all bookings</Text>
                  </View>
                  <FontAwesome5 name="chevron-right" size={16} color="#9CA3AF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionCard, styles.dangerCard]}
                  onPress={handleDeleteSchedule}
                >
                  <View style={[styles.actionIcon, styles.dangerIcon]}>
                    <FontAwesome5 name="trash" size={20} color="#EF4444" />
                  </View>
                  <View style={styles.actionContent}>
                    <Text style={[styles.actionTitle, styles.dangerText]}>Delete Schedule</Text>
                    <Text style={styles.actionSubtitle}>Permanently remove</Text>
                  </View>
                  <FontAwesome5 name="chevron-right" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.bookingsContent}>
            {bookings.length > 0 ? (
              <FlatList
                data={bookings}
                renderItem={renderBookingCard}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.bookingsList}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.emptyBookings}>
                <FontAwesome5 name="ticket-alt" size={48} color="#9CA3AF" />
                <Text style={styles.emptyTitle}>No Bookings Yet</Text>
                <Text style={styles.emptyDescription}>
                  No bookings have been made for this schedule yet.
                </Text>
                <TouchableOpacity
                  style={styles.createBookingBtn}
                  onPress={() => navigation.navigate('CreateBooking', { scheduleId: schedule.id })}
                >
                  <FontAwesome5 name="plus" size={16} color="#FFF" />
                  <Text style={styles.createBookingText}>Create First Booking</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>
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
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  statusCard: {
    backgroundColor: '#FFF',
    margin: 16,
    borderRadius: 12,
    padding: 16,
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

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#FFF',
  },

  content: {
    flex: 1,
  },

  detailsContent: {
    padding: 16,
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
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  infoCard: {
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
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },

  destinationsSection: {
    marginBottom: 24,
  },
  destinationCard: {
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
  destinationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  destinationNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  destinationNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  destinationInfo: {
    flex: 1,
  },
  destinationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  destinationTimes: {
    flexDirection: 'row',
    gap: 12,
  },
  timeText: {
    fontSize: 12,
    color: '#6B7280',
  },
  destinationTypes: {
    alignItems: 'flex-end',
    gap: 4,
  },
  typeBadge: {
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#007AFF',
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

  bookingsContent: {
    flex: 1,
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
  bookingAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 4,
  },
  customerType: {
    fontSize: 12,
    color: '#6B7280',
  },
  bookingSeats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  seatsText: {
    fontSize: 14,
    color: '#374151',
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookingDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  viewBookingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  viewBookingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },

  emptyBookings: {
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