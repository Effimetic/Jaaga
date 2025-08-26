import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import {
    Button,
    Card,
    Chip,
    Divider,
    Surface,
    Text,
} from '../../compat/paper';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/apiService';
import { notificationService } from '../../services/notificationService';
import { useBookingStore } from '../../stores/bookingStore';
import { colors, spacing, theme } from '../../theme/theme';

interface ConfirmationStepProps {
  navigation: any;
}

export const ConfirmationStep: React.FC<ConfirmationStepProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  
  const {
    schedule,
    selectedSeats,
    passengers,
    selectedPaymentMethod,
    pricing,
    currentBooking,
    setCurrentBooking,
    resetBooking,
  } = useBookingStore();

  useEffect(() => {
    if (!bookingComplete && schedule && selectedPaymentMethod && pricing) {
      createBooking();
    }
  }, []);

  const createBooking = async () => {
    if (!user || !schedule || !selectedPaymentMethod || !pricing) return;

    setCreating(true);
    
    try {
      // Create booking request
      const bookingRequest = {
        scheduleId: schedule.id,
        segmentKey: 'default',
        ticketTypeId: pricing.items[0]?.ticket_type_id || '',
        passengers: passengers,
        seats: selectedSeats,
        seatCount: passengers.length,
        paymentMethod: selectedPaymentMethod,
      };

      const result = await apiService.createBooking(bookingRequest);
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to create booking');
      }

      setCurrentBooking(result.data);

      // Handle different payment methods
      switch (selectedPaymentMethod) {
        case 'CASH':
          await handleCashPayment(result.data);
          break;
        case 'CARD_BML':
          await handleCardPayment(result.data);
          break;
        case 'BANK_TRANSFER':
          await handleBankTransferPayment(result.data);
          break;
      }

      setBookingComplete(true);
      
    } catch (error: any) {
      console.error('Error creating booking:', error);
      Alert.alert(
        'Booking Failed',
        error.message || 'Unable to create your booking. Please try again.',
        [
          { text: 'Try Again', onPress: () => setCreating(false) },
          { text: 'Go Back', onPress: () => navigation.goBack() }
        ]
      );
    } finally {
      setCreating(false);
    }
  };

  const handleCashPayment = async (booking: any) => {
    // For cash payments, just send confirmation SMS
    const mainPassenger = passengers[0];
    if (mainPassenger.phone && schedule) {
      await notificationService.sendBookingConfirmation(
        { ...booking, schedule },
        mainPassenger.phone
      );
    }
  };

  const handleCardPayment = async (booking: any) => {
    // In a real app, this would redirect to BML gateway
    // For demo, we'll simulate immediate payment
    setTimeout(async () => {
      // Confirm the booking and issue tickets
      const ticketsResult = await apiService.confirmBooking(booking.id);
      
      if (ticketsResult.success && ticketsResult.data && schedule) {
        // Send tickets via SMS using notification service
        for (const ticket of ticketsResult.data) {
          const passenger = passengers.find(p => p.seat_id === ticket.seat_id) || passengers[0];
          
          if (passenger.phone) {
            await notificationService.sendTicketIssued(
              { ...ticket, booking: { ...booking, schedule } },
              passenger.phone
            );
          }
        }
      }
    }, 2000); // Simulate payment processing delay
  };

  const handleBankTransferPayment = async (booking: any) => {
    // For bank transfer, booking remains pending until receipt is verified
    const mainPassenger = passengers[0];
    if (mainPassenger.phone) {
      await notificationService.sendNotification({
        type: 'PAYMENT_REMINDER',
        recipients: [{ phone: mainPassenger.phone }],
        data: {
          recipientName: mainPassenger.name,
          currency: pricing?.currency || 'MVR',
          amount: pricing?.total.toFixed(2) || '0.00',
          dueDate: 'within 24 hours',
          description: `Bank transfer for booking ${booking.id.slice(-8).toUpperCase()}`,
          companyName: schedule?.owner?.brand_name || 'Ferry Services'
        },
        priority: 'HIGH' as const
      });
    }
  };

  const getPaymentStatusIcon = () => {
    if (creating) return 'clock-outline';
    
    switch (selectedPaymentMethod) {
      case 'CASH':
        return 'cash';
      case 'CARD_BML':
        return 'credit-card-check';
      case 'BANK_TRANSFER':
        return 'bank-transfer';
      default:
        return 'check-circle';
    }
  };

  const getPaymentStatusText = () => {
    if (creating) return 'Creating your booking...';
    
    switch (selectedPaymentMethod) {
      case 'CASH':
        return 'Booking confirmed! Pay at counter';
      case 'CARD_BML':
        return 'Payment processing...';
      case 'BANK_TRANSFER':
        return 'Awaiting bank transfer verification';
      default:
        return 'Booking complete!';
    }
  };

  const getPaymentStatusColor = () => {
    if (creating) return theme.colors.onSurface;
    
    switch (selectedPaymentMethod) {
      case 'CASH':
        return colors.warning;
      case 'CARD_BML':
        return colors.success;
      case 'BANK_TRANSFER':
        return theme.colors.primary;
      default:
        return colors.success;
    }
  };

  const renderBookingHeader = () => (
    <Surface style={styles.headerCard} elevation={2}>
      <View style={styles.statusIndicator}>
        <MaterialCommunityIcons
          name={getPaymentStatusIcon()}
          size={48}
          color={getPaymentStatusColor()}
        />
        <Text variant="headlineSmall" style={[styles.statusText, { color: getPaymentStatusColor() }]}>
          {getPaymentStatusText()}
        </Text>
        
        {currentBooking && (
          <View style={styles.bookingIdContainer}>
            <Text variant="bodyMedium" style={styles.bookingIdLabel}>
              Booking Reference
            </Text>
            <Text variant="titleLarge" style={styles.bookingId}>
              {currentBooking.id.slice(-8).toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      
      {creating && <Text variant="headlineSmall" style={styles.loader}>Creating your booking...</Text>}
    </Surface>
  );

  const renderTripSummary = () => (
    <Card style={styles.summaryCard}>
      <Card.Content>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Trip Details
        </Text>
        
        <View style={styles.tripInfo}>
          <View style={styles.tripRow}>
            <MaterialCommunityIcons name="ferry" size={20} color={theme.colors.primary} />
            <Text variant="bodyMedium">{schedule?.boat.name}</Text>
          </View>
          
          <View style={styles.tripRow}>
            <MaterialCommunityIcons name="domain" size={20} color={theme.colors.primary} />
            <Text variant="bodyMedium">{schedule?.owner.brand_name}</Text>
          </View>
          
          <View style={styles.tripRow}>
            <MaterialCommunityIcons name="clock-outline" size={20} color={theme.colors.primary} />
            <Text variant="bodyMedium">
              {schedule && format(new Date(schedule.start_at), 'HH:mm, EEE MMM d')}
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  const renderPassengerSummary = () => (
    <Card style={styles.summaryCard}>
      <Card.Content>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Passengers & Seats
        </Text>
        
        <View style={styles.passengerList}>
          {passengers.map((passenger, index) => (
            <View key={index} style={styles.passengerRow}>
              <View style={styles.passengerInfo}>
                <MaterialCommunityIcons name="account" size={16} color={theme.colors.primary} />
                <Text variant="bodyMedium" style={styles.passengerName}>
                  {passenger.name}
                </Text>
              </View>
              
              {passenger.seat_id && (
                <Chip mode="outlined" compact icon="seat">
                  {passenger.seat_id}
                </Chip>
              )}
            </View>
          ))}
        </View>
      </Card.Content>
    </Card>
  );

  const renderPaymentSummary = () => (
    <Card style={styles.summaryCard}>
      <Card.Content>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Payment Summary
        </Text>
        
        <View style={styles.paymentDetails}>
          <View style={styles.paymentRow}>
            <Text variant="bodyMedium">Subtotal</Text>
            <Text variant="bodyMedium">
              {pricing?.currency} {pricing?.subtotal.toFixed(2)}
            </Text>
          </View>
          
          <View style={styles.paymentRow}>
            <Text variant="bodyMedium">Tax</Text>
            <Text variant="bodyMedium">
              {pricing?.currency} {pricing?.tax.toFixed(2)}
            </Text>
          </View>
          
          <Divider style={styles.paymentDivider} />
          
          <View style={[styles.paymentRow, styles.totalRow]}>
            <Text variant="titleMedium" style={styles.totalLabel}>
              Total
            </Text>
            <Text variant="titleLarge" style={styles.totalAmount}>
              {pricing?.currency} {pricing?.total.toFixed(2)}
            </Text>
          </View>
          
          <View style={styles.paymentMethodRow}>
            <MaterialCommunityIcons 
              name={selectedPaymentMethod === 'CASH' ? 'cash' : selectedPaymentMethod === 'CARD_BML' ? 'credit-card' : 'bank-transfer'} 
              size={16} 
              color={theme.colors.primary} 
            />
            <Text variant="bodyMedium">
              {selectedPaymentMethod === 'CASH' ? 'Cash at Counter' :
               selectedPaymentMethod === 'CARD_BML' ? 'Credit/Debit Card' : 'Bank Transfer'}
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  const renderNextSteps = () => {
    let instructions: string[] = [];
    
    switch (selectedPaymentMethod) {
      case 'CASH':
        instructions = [
          'Visit our counter to complete payment',
          'Bring exact change if possible',
          'Arrive 30 minutes before departure',
          'Bring valid ID for verification'
        ];
        break;
      case 'CARD_BML':
        instructions = [
          'Payment will be processed automatically',
          'Tickets will be sent via SMS shortly',
          'Arrive 15 minutes before departure',
          'Bring valid ID for verification'
        ];
        break;
      case 'BANK_TRANSFER':
        instructions = [
          'Transfer the exact amount to our bank account',
          'Upload your transfer receipt',
          'Tickets will be issued after verification',
          'Check SMS for updates'
        ];
        break;
    }

    return (
      <Surface style={styles.instructionsCard} elevation={1}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Next Steps
        </Text>
        
        <View style={styles.instructionsList}>
          {instructions.map((instruction, index) => (
            <View key={index} style={styles.instructionRow}>
              <Text variant="bodyMedium" style={styles.instructionNumber}>
                {index + 1}.
              </Text>
              <Text variant="bodyMedium" style={styles.instructionText}>
                {instruction}
              </Text>
            </View>
          ))}
        </View>
      </Surface>
    );
  };

  const renderActions = () => {
    if (creating) return null;
    
    return (
      <View style={styles.actionsContainer}>
        <Button
          mode="outlined"
          onPress={() => {
            resetBooking();
            navigation.navigate('Search');
          }}
          style={styles.actionButton}
          icon="magnify"
        >
          Book Another Trip
        </Button>
        
        <Button
          mode="contained"
          onPress={() => {
            resetBooking();
            navigation.navigate('Home');
          }}
          style={styles.actionButton}
          icon="home"
        >
          Go to Home
        </Button>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {renderBookingHeader()}
      {renderTripSummary()}
      {renderPassengerSummary()}
      {renderPaymentSummary()}
      {renderNextSteps()}
      {renderActions()}
      
      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
  },
  headerCard: {
    borderRadius: 16,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    alignItems: 'center',
    backgroundColor: theme.colors.primaryContainer,
  },
  statusIndicator: {
    alignItems: 'center',
    gap: spacing.md,
  },
  statusText: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  bookingIdContainer: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  bookingIdLabel: {
    opacity: 0.7,
  },
  bookingId: {
    fontWeight: 'bold',
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  loader: {
    marginTop: spacing.md,
  },
  summaryCard: {
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  tripInfo: {
    gap: spacing.sm,
  },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  passengerList: {
    gap: spacing.sm,
  },
  passengerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  passengerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  passengerName: {
    flex: 1,
  },
  paymentDetails: {
    gap: spacing.sm,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentDivider: {
    marginVertical: spacing.sm,
  },
  totalRow: {
    paddingTop: spacing.sm,
  },
  totalLabel: {
    fontWeight: 'bold',
  },
  totalAmount: {
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 8,
  },
  instructionsCard: {
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  instructionsList: {
    gap: spacing.sm,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  instructionNumber: {
    fontWeight: 'bold',
    color: theme.colors.primary,
    minWidth: 20,
  },
  instructionText: {
    flex: 1,
    lineHeight: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  bottomSpacing: {
    height: spacing.xl,
  },
});
