import React, { useEffect, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Share,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { apiService } from '../services/apiService';

interface Booking {
  id: number;
  code: string;
  buyer_name: string;
  buyer_phone: string;
  schedule_name: string;
  schedule_date: string;
  boat_name: string;
  grand_total: number;
  currency: string;
  payment_status: string;
  fulfillment_status: string;
  tickets: Array<{
    id: number;
    ticket_type_name: string;
    passenger_name: string;
    seat_no: string;
    fare_base_price: number;
  }>;
  pickup_destination: {
    island_name: string;
  };
  dropoff_destination: {
    island_name: string;
  };
  departure_time?: string;
}

export default function IssueTicketScreen({ navigation, route }: { navigation: any; route: any }) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isIssuing, setIsIssuing] = useState(false);

  const { bookingId } = route.params || {};

  useEffect(() => {
    loadBooking();
  }, [bookingId]);

  const loadBooking = async () => {
    try {
      setIsLoading(true);
      
      if (!bookingId) {
        Alert.alert('Error', 'No booking selected');
        navigation.goBack();
        return;
      }

      const response = await apiService.getBookingById(bookingId);
      
      if (response.success) {
        setBooking(response.data);
      } else {
        Alert.alert('Error', 'Failed to load booking details');
        navigation.goBack();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load booking');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const handleIssueTicket = async () => {
    if (!booking) return;

    setIsIssuing(true);

    try {
      // In a real implementation, this would generate a PDF ticket and QR code
      // For now, we'll simulate the ticket issuance
      
      const ticketUrl = `https://nashath.booking/ticket/${booking.code}`;
      
      Alert.alert(
        'Ticket Issued',
        'Digital ticket has been generated successfully!',
        [
          {
            text: 'Share Ticket',
            onPress: () => shareTicket(ticketUrl),
          },
          {
            text: 'OK',
            style: 'default',
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to issue ticket');
    } finally {
      setIsIssuing(false);
    }
  };

  const shareTicket = async (ticketUrl: string) => {
    try {
      const message = `🎫 Your boat ticket is ready!\n\nBooking: ${booking?.code}\nSchedule: ${booking?.schedule_name}\nDate: ${booking && new Date(booking.schedule_date).toLocaleDateString()}\n\nView your ticket: ${ticketUrl}`;
      
      await Share.share({
        message: message,
        title: 'Boat Ticket - ' + booking?.code,
      });
    } catch (error) {
      console.error('Error sharing ticket:', error);
    }
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
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
      case 'confirmed':
        return '#10B981';
      case 'pending':
        return '#F59E0B';
      case 'cancelled':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <FontAwesome5 name="spinner" size={24} color="#007AFF" />
          <Text style={styles.loadingText}>Loading booking...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Booking not found</Text>
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
          <Text style={styles.headerTitle}>Issue Ticket</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Ticket Preview */}
        <View style={styles.ticketPreview}>
          <View style={styles.ticketHeader}>
            <Text style={styles.ticketTitle}>BOAT TICKET</Text>
            <Text style={styles.bookingCode}>{booking.code}</Text>
            <Text style={styles.ticketStatus}>
              Confirmed • {booking.boat_name}
            </Text>
          </View>

          <View style={styles.ticketSection}>
            <Text style={styles.sectionTitle}>SCHEDULE</Text>
            <View style={styles.ticketRow}>
              <Text style={styles.ticketLabel}>Date</Text>
              <Text style={styles.ticketValue}>{formatDate(booking.schedule_date)}</Text>
            </View>
            <View style={styles.ticketRow}>
              <Text style={styles.ticketLabel}>Departure</Text>
              <Text style={styles.ticketValue}>{formatTime(booking.departure_time)}</Text>
            </View>
          </View>

          <View style={styles.ticketSection}>
            <Text style={styles.sectionTitle}>PASSENGER</Text>
            <View style={styles.ticketRow}>
              <Text style={styles.ticketLabel}>Name</Text>
              <Text style={styles.ticketValue}>{booking.buyer_name}</Text>
            </View>
            <View style={styles.ticketRow}>
              <Text style={styles.ticketLabel}>Phone</Text>
              <Text style={styles.ticketValue}>{booking.buyer_phone}</Text>
            </View>
          </View>

          <View style={styles.ticketSection}>
            <Text style={styles.sectionTitle}>ROUTE</Text>
            <View style={styles.routeContainer}>
              <View style={styles.routeChip}>
                <Text style={styles.routeChipText}>{booking.pickup_destination.island_name}</Text>
              </View>
              <FontAwesome5 name="arrow-right" size={14} color="#6B7280" />
              <View style={styles.routeChip}>
                <Text style={styles.routeChipText}>{booking.dropoff_destination.island_name}</Text>
              </View>
            </View>
          </View>

          <View style={styles.ticketSection}>
            <Text style={styles.sectionTitle}>TICKETS</Text>
            {booking.tickets.map((ticket, index) => (
              <View key={ticket.id} style={styles.ticketRow}>
                <Text style={styles.ticketLabel}>
                  Seat {ticket.seat_no} • {ticket.ticket_type_name}
                </Text>
                <Text style={styles.ticketValue}>
                  {booking.currency} {ticket.fare_base_price.toFixed(2)}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.ticketSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                {booking.currency} {booking.grand_total.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* QR Code Placeholder */}
          <View style={styles.qrSection}>
            <View style={styles.qrPlaceholder}>
              <FontAwesome5 name="qrcode" size={60} color="#9CA3AF" />
            </View>
            <Text style={styles.qrCode}>{booking.code}</Text>
          </View>

          <View style={styles.ticketFooter}>
            <Text style={styles.footerText}>
              Valid for scheduled trip only • Arrive 30 min before departure
            </Text>
            <Text style={styles.footerText}>
              Generated: {new Date().toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Booking Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Payment Status:</Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(booking.payment_status) }
            ]}>
              <Text style={styles.statusBadgeText}>
                {booking.payment_status.charAt(0).toUpperCase() + booking.payment_status.slice(1)}
              </Text>
            </View>
          </View>
          
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Fulfillment Status:</Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(booking.fulfillment_status) }
            ]}>
              <Text style={styles.statusBadgeText}>
                {booking.fulfillment_status.charAt(0).toUpperCase() + booking.fulfillment_status.slice(1)}
              </Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={[styles.issueButton, isIssuing && styles.disabledButton]}
            onPress={handleIssueTicket}
            disabled={isIssuing}
          >
            {isIssuing ? (
              <Text style={styles.issueButtonText}>Issuing Ticket...</Text>
            ) : (
              <>
                <FontAwesome5 name="ticket-alt" size={16} color="#FFF" />
                <Text style={styles.issueButtonText}>Issue Digital Ticket</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shareButton}
            onPress={() => shareTicket(`https://nashath.booking/ticket/${booking.code}`)}
          >
            <FontAwesome5 name="share" size={16} color="#007AFF" />
            <Text style={styles.shareButtonText}>Share Ticket Link</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.viewBookingButton}
            onPress={() => navigation.navigate('ViewBooking', { bookingId: booking.id })}
          >
            <FontAwesome5 name="eye" size={16} color="#6B7280" />
            <Text style={styles.viewBookingButtonText}>View Full Booking Details</Text>
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
  backButton: { padding: 8 },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  placeholder: { width: 36 },

  ticketPreview: {
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

  ticketHeader: {
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
  bookingCode: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 2,
    marginBottom: 4,
  },
  ticketStatus: {
    fontSize: 12,
    color: '#6B7280',
  },

  ticketSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionTitle: {
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
    textAlign: 'right',
  },

  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  routeChipText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
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
    fontSize: 11,
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

  statusCard: {
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
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },

  actionsSection: {
    gap: 12,
  },
  issueButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  issueButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },

  shareButton: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  shareButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },

  viewBookingButton: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  viewBookingButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
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