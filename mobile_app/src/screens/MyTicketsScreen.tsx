import React, { useState, useEffect } from 'react';
import {
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Share,
  Modal,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { apiService } from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';
import { Ticket, Booking } from '../types';

interface TicketWithBooking extends Ticket {
  booking: Booking;
}

export default function MyTicketsScreen({ navigation }: { navigation: any }) {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<TicketWithBooking[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<TicketWithBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'UPCOMING' | 'PAST' | 'CANCELLED'>('ALL');
  const [selectedTicket, setSelectedTicket] = useState<TicketWithBooking | null>(null);
  const [showTicketModal, setShowTicketModal] = useState(false);

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    filterTickets();
  }, [tickets, searchQuery, filterStatus]);

  const loadTickets = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getMyTickets();
      
      if (response.success) {
        setTickets(response.data || []);
      } else {
        console.error('Failed to load tickets:', response.error);
      }
    } catch (error: any) {
      console.error('Error loading tickets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterTickets = () => {
    let filtered = tickets;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ticket => 
        ticket.booking.code.toLowerCase().includes(query) ||
        ticket.passenger_name.toLowerCase().includes(query) ||
        ticket.booking.schedule.name.toLowerCase().includes(query)
      );
    }

    // Filter by status
    const now = new Date();
    switch (filterStatus) {
      case 'UPCOMING':
        filtered = filtered.filter(ticket => {
          const scheduleDate = new Date(ticket.booking.schedule.date_time_start);
          return scheduleDate >= now && ticket.status === 'ISSUED';
        });
        break;
      case 'PAST':
        filtered = filtered.filter(ticket => {
          const scheduleDate = new Date(ticket.booking.schedule.date_time_start);
          return scheduleDate < now || ticket.status === 'USED';
        });
        break;
      case 'CANCELLED':
        filtered = filtered.filter(ticket => 
          ticket.status === 'VOID' || ticket.status === 'REFUNDED'
        );
        break;
    }

    setFilteredTickets(filtered);
  };

  const handleTicketPress = (ticket: TicketWithBooking) => {
    setSelectedTicket(ticket);
    setShowTicketModal(true);
  };

  const handleShareTicket = async (ticket: TicketWithBooking) => {
    try {
      const ticketUrl = `https://nashath.booking/ticket/${ticket.booking.code}`;
      const message = `🎫 Your boat ticket\n\nBooking: ${ticket.booking.code}\nPassenger: ${ticket.passenger_name}\nSchedule: ${ticket.booking.schedule.name}\nDate: ${new Date(ticket.booking.schedule.date_time_start).toLocaleDateString()}\n\nView ticket: ${ticketUrl}`;
      
      await Share.share({
        message: message,
        title: 'Boat Ticket - ' + ticket.booking.code,
      });
    } catch (error) {
      console.error('Error sharing ticket:', error);
    }
  };

  const handleResendTicket = async (ticket: TicketWithBooking) => {
    try {
      const response = await apiService.resendTicket(ticket.id);
      if (response.success) {
        Alert.alert('Success', 'Ticket has been resent to your phone and email');
      } else {
        Alert.alert('Error', response.error || 'Failed to resend ticket');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend ticket');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ISSUED':
        return '#10B981';
      case 'USED':
        return '#6B7280';
      case 'VOID':
      case 'REFUNDED':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ISSUED':
        return 'check-circle';
      case 'USED':
        return 'check-double';
      case 'VOID':
      case 'REFUNDED':
        return 'times-circle';
      default:
        return 'question-circle';
    }
  };

  const isUpcoming = (ticket: TicketWithBooking) => {
    const scheduleDate = new Date(ticket.booking.schedule.date_time_start);
    return scheduleDate >= new Date() && ticket.status === 'ISSUED';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderTicketCard = ({ item }: { item: TicketWithBooking }) => (
    <TouchableOpacity
      style={[
        styles.ticketCard,
        isUpcoming(item) && styles.upcomingTicketCard
      ]}
      onPress={() => handleTicketPress(item)}
    >
      <View style={styles.ticketHeader}>
        <View style={styles.ticketInfo}>
          <Text style={styles.ticketCode}>{item.booking.code}</Text>
          <Text style={styles.passengerName}>{item.passenger_name}</Text>
          <Text style={styles.scheduleName}>{item.booking.schedule.name}</Text>
        </View>
        <View style={styles.ticketStatus}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) }
          ]}>
            <FontAwesome5 
              name={getStatusIcon(item.status)} 
              size={12} 
              color="#FFF" 
            />
            <Text style={styles.statusText}>
              {item.status.charAt(0) + item.status.slice(1).toLowerCase()}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.ticketDetails}>
        <View style={styles.detailRow}>
          <FontAwesome5 name="calendar" size={14} color="#6B7280" />
          <Text style={styles.detailText}>
            {formatDate(item.booking.schedule.date_time_start)}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <FontAwesome5 name="clock" size={14} color="#6B7280" />
          <Text style={styles.detailText}>
            {formatTime(item.booking.schedule.date_time_start)}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <FontAwesome5 name="ship" size={14} color="#6B7280" />
          <Text style={styles.detailText}>{item.booking.schedule.boat.name}</Text>
        </View>
        
        {item.seat_number && (
          <View style={styles.detailRow}>
            <FontAwesome5 name="chair" size={14} color="#6B7280" />
            <Text style={styles.detailText}>Seat {item.seat_number}</Text>
          </View>
        )}
      </View>

      {isUpcoming(item) && (
        <View style={styles.upcomingBadge}>
          <FontAwesome5 name="clock" size={12} color="#F59E0B" />
          <Text style={styles.upcomingText}>Upcoming Trip</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderTicketModal = () => (
    <Modal
      visible={showTicketModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowTicketModal(false)}
    >
      <SafeAreaView style={styles.modalSafe}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowTicketModal(false)}
          >
            <FontAwesome5 name="times" size={20} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Ticket Details</Text>
          <View style={styles.placeholder} />
        </View>

        {selectedTicket && (
          <ScrollView style={styles.modalContent}>
            {/* Digital Ticket Display */}
            <View style={styles.digitalTicket}>
              <View style={styles.ticketTop}>
                <Text style={styles.ticketTitle}>BOAT TICKET</Text>
                <Text style={styles.ticketCodeLarge}>{selectedTicket.booking.code}</Text>
                <Text style={styles.ticketSubtitle}>
                  Confirmed • {selectedTicket.booking.schedule.boat.name}
                </Text>
              </View>

              <View style={styles.ticketSection}>
                <Text style={styles.ticketSectionTitle}>SCHEDULE</Text>
                <View style={styles.ticketRow}>
                  <Text style={styles.ticketLabel}>Date</Text>
                  <Text style={styles.ticketValue}>
                    {formatDate(selectedTicket.booking.schedule.date_time_start)}
                  </Text>
                </View>
                <View style={styles.ticketRow}>
                  <Text style={styles.ticketLabel}>Departure</Text>
                  <Text style={styles.ticketValue}>
                    {formatTime(selectedTicket.booking.schedule.date_time_start)}
                  </Text>
                </View>
              </View>

              <View style={styles.ticketSection}>
                <Text style={styles.ticketSectionTitle}>PASSENGER</Text>
                <View style={styles.ticketRow}>
                  <Text style={styles.ticketLabel}>Name</Text>
                  <Text style={styles.ticketValue}>{selectedTicket.passenger_name}</Text>
                </View>
                {selectedTicket.passenger_phone && (
                  <View style={styles.ticketRow}>
                    <Text style={styles.ticketLabel}>Phone</Text>
                    <Text style={styles.ticketValue}>{selectedTicket.passenger_phone}</Text>
                  </View>
                )}
                {selectedTicket.seat_number && (
                  <View style={styles.ticketRow}>
                    <Text style={styles.ticketLabel}>Seat</Text>
                    <Text style={styles.ticketValue}>{selectedTicket.seat_number}</Text>
                  </View>
                )}
              </View>

              <View style={styles.ticketSection}>
                <Text style={styles.ticketSectionTitle}>ROUTE</Text>
                <View style={styles.routeDisplay}>
                  {selectedTicket.booking.schedule.segments.map((segment, index) => (
                    <View key={segment.id} style={styles.routeSegment}>
                      <Text style={styles.routeLocation}>{segment.pickup}</Text>
                      {index < selectedTicket.booking.schedule.segments.length - 1 && (
                        <FontAwesome5 name="arrow-right" size={12} color="#6B7280" />
                      )}
                    </View>
                  ))}
                </View>
              </View>

              {/* QR Code */}
              <View style={styles.qrSection}>
                <View style={styles.qrPlaceholder}>
                  <FontAwesome5 name="qrcode" size={60} color="#9CA3AF" />
                </View>
                <Text style={styles.qrCode}>{selectedTicket.booking.code}</Text>
              </View>

              <View style={styles.ticketFooter}>
                <Text style={styles.footerText}>
                  Valid for scheduled trip only • Arrive 30 min before departure
                </Text>
                <Text style={styles.footerText}>
                  Generated: {formatDate(selectedTicket.created_at)}
                </Text>
              </View>
            </View>

            {/* Ticket Actions */}
            <View style={styles.ticketActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleShareTicket(selectedTicket)}
              >
                <FontAwesome5 name="share" size={16} color="#007AFF" />
                <Text style={styles.actionButtonText}>Share Ticket</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleResendTicket(selectedTicket)}
              >
                <FontAwesome5 name="envelope" size={16} color="#007AFF" />
                <Text style={styles.actionButtonText}>Resend via SMS</Text>
              </TouchableOpacity>

              {isUpcoming(selectedTicket) && selectedTicket.booking.status !== 'CANCELLED' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={() => {
                    Alert.alert(
                      'Cancel Ticket',
                      'Are you sure you want to cancel this ticket? Refund policies apply.',
                      [
                        { text: 'No', style: 'cancel' },
                        { text: 'Yes, Cancel', style: 'destructive', onPress: () => {
                          // TODO: Implement cancellation
                          Alert.alert('Coming Soon', 'Ticket cancellation will be available soon');
                        }}
                      ]
                    );
                  }}
                >
                  <FontAwesome5 name="times-circle" size={16} color="#EF4444" />
                  <Text style={[styles.actionButtonText, styles.cancelButtonText]}>Cancel Ticket</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <FontAwesome5 name="ticket-alt" size={48} color="#9CA3AF" />
      <Text style={styles.emptyTitle}>No Tickets Found</Text>
      <Text style={styles.emptyDescription}>
        {searchQuery || filterStatus !== 'ALL' 
          ? 'No tickets match your current filters'
          : 'You haven\'t booked any trips yet'
        }
      </Text>
      {(!searchQuery && filterStatus === 'ALL') && (
        <TouchableOpacity
          style={styles.emptyActionBtn}
          onPress={() => navigation.navigate('Search')}
        >
          <FontAwesome5 name="search" size={16} color="#FFF" />
          <Text style={styles.emptyActionText}>Search Trips</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <FontAwesome5 name="spinner" size={24} color="#007AFF" />
          <Text style={styles.loadingText}>Loading tickets...</Text>
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
          <Text style={styles.headerTitle}>My Tickets</Text>
          <Text style={styles.headerSubtitle}>View and manage your tickets</Text>
        </View>
      </View>

      {/* Search and Filter */}
      <View style={styles.searchFilterSection}>
        <View style={styles.searchContainer}>
          <FontAwesome5 name="search" size={16} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by booking code, passenger, or schedule..."
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

        <View style={styles.filterTabs}>
          {['ALL', 'UPCOMING', 'PAST', 'CANCELLED'].map(status => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterTab,
                filterStatus === status && styles.activeFilterTab
              ]}
              onPress={() => setFilterStatus(status as any)}
            >
              <Text style={[
                styles.filterTabText,
                filterStatus === status && styles.activeFilterTabText
              ]}>
                {status.charAt(0) + status.slice(1).toLowerCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Stats Summary */}
      <View style={styles.statsSummary}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{tickets.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {tickets.filter(t => isUpcoming(t)).length}
          </Text>
          <Text style={styles.statLabel}>Upcoming</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {tickets.filter(t => t.status === 'USED').length}
          </Text>
          <Text style={styles.statLabel}>Used</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {tickets.filter(t => t.status === 'VOID' || t.status === 'REFUNDED').length}
          </Text>
          <Text style={styles.statLabel}>Cancelled</Text>
        </View>
      </View>

      {/* Tickets List */}
      {filteredTickets.length > 0 ? (
        <FlatList
          data={filteredTickets}
          renderItem={renderTicketCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.ticketsList}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        renderEmptyState()
      )}

      {/* Ticket Detail Modal */}
      {renderTicketModal()}
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
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },

  searchFilterSection: {
    backgroundColor: '#FFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
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

  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeFilterTab: {
    backgroundColor: '#007AFF',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeFilterTabText: {
    color: '#FFF',
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
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
  },

  ticketsList: {
    padding: 16,
    gap: 12,
  },

  ticketCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#E5E7EB',
  },
  upcomingTicketCard: {
    borderLeftColor: '#10B981',
    backgroundColor: '#FEFFFE',
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  ticketInfo: {
    flex: 1,
  },
  ticketCode: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    letterSpacing: 1,
  },
  passengerName: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 2,
  },
  scheduleName: {
    fontSize: 14,
    color: '#6B7280',
  },
  ticketStatus: {
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

  ticketDetails: {
    gap: 6,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#374151',
  },

  upcomingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    gap: 4,
  },
  upcomingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
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

  // Modal Styles
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
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalCloseButton: {
    padding: 8,
  },
  placeholder: { width: 36 },
  modalContent: {
    flex: 1,
    padding: 16,
  },

  // Digital Ticket Styles
  digitalTicket: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    overflow: 'hidden',
  },
  ticketTop: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    alignItems: 'center',
  },
  ticketTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  ticketCodeLarge: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 2,
    marginBottom: 4,
  },
  ticketSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  ticketSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  ticketSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  ticketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  ticketLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  ticketValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },

  routeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  routeSegment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeLocation: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },

  qrSection: {
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  qrPlaceholder: {
    width: 120,
    height: 120,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  qrCode: {
    fontSize: 12,
    color: '#6B7280',
    letterSpacing: 1,
  },

  ticketFooter: {
    alignItems: 'center',
    padding: 12,
  },
  footerText: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 16,
  },

  ticketActions: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  cancelButton: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
  },
  cancelButtonText: {
    color: '#EF4444',
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