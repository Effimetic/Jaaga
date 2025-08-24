import React, { useState, useEffect } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { apiService } from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';
import { Booking, Schedule, TicketType, BookingFormData } from '../types';

interface SeatMapSeat {
  id: number;
  number: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'SELECTED' | 'BLOCKED';
  price?: number;
}

export default function BookingFlowScreen({ navigation, route }: { navigation: any; route: any }) {
  const { user, hasPermission } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [selectedTickets, setSelectedTickets] = useState<{[key: number]: number}>({});
  const [passengers, setPassengers] = useState<any[]>([]);
  const [seatMap, setSeatMap] = useState<SeatMapSeat[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [bookingData, setBookingData] = useState<BookingFormData>({
    schedule_id: 0,
    ticket_types: [],
    passengers: [],
    buyer_name: '',
    buyer_phone: '',
    payment_method: 'CARD',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const { scheduleId, segmentId } = route.params || {};

  useEffect(() => {
    loadScheduleData();
  }, [scheduleId]);

  const loadScheduleData = async () => {
    try {
      setIsLoading(true);
      
      const [scheduleResponse, ticketTypesResponse] = await Promise.all([
        apiService.getScheduleById(scheduleId),
        apiService.getScheduleTicketTypes(scheduleId)
      ]);
      
      if (scheduleResponse.success) {
        setSchedule(scheduleResponse.data);
        setBookingData(prev => ({ ...prev, schedule_id: scheduleId }));
        
        // Load seat map if boat uses seat mapping
        if (scheduleResponse.data.boat.seat_mode === 'SEATMAP') {
          loadSeatMap();
        }
      }

      if (ticketTypesResponse.success) {
        setTicketTypes(ticketTypesResponse.data || []);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load schedule data');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const loadSeatMap = async () => {
    try {
      const response = await apiService.getScheduleSeatMap(scheduleId);
      if (response.success) {
        setSeatMap(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load seat map:', error);
    }
  };

  const handleTicketSelection = (ticketTypeId: number, quantity: number) => {
    setSelectedTickets(prev => {
      const updated = { ...prev };
      if (quantity === 0) {
        delete updated[ticketTypeId];
      } else {
        updated[ticketTypeId] = quantity;
      }
      return updated;
    });

    // Update passengers array
    updatePassengersFromTickets();
  };

  const updatePassengersFromTickets = () => {
    const newPassengers: any[] = [];
    
    Object.entries(selectedTickets).forEach(([ticketTypeId, quantity]) => {
      for (let i = 0; i < quantity; i++) {
        newPassengers.push({
          name: '',
          phone: '',
          ticket_type_id: parseInt(ticketTypeId),
          seat_id: null,
        });
      }
    });
    
    setPassengers(newPassengers);
    setBookingData(prev => ({ 
      ...prev, 
      passengers: newPassengers,
      ticket_types: Object.entries(selectedTickets).map(([id, qty]) => ({
        ticket_type_id: parseInt(id),
        quantity: qty
      }))
    }));
  };

  const handleSeatSelection = (seatId: number) => {
    if (schedule?.boat.seat_mode !== 'SEATMAP') return;

    const seat = seatMap.find(s => s.id === seatId);
    if (!seat || seat.status !== 'AVAILABLE') return;

    const totalPassengers = Object.values(selectedTickets).reduce((sum, qty) => sum + qty, 0);
    
    if (selectedSeats.includes(seatId)) {
      // Deselect seat
      setSelectedSeats(prev => prev.filter(id => id !== seatId));
    } else if (selectedSeats.length < totalPassengers) {
      // Select seat
      setSelectedSeats(prev => [...prev, seatId]);
    } else {
      Alert.alert('Seat Limit', 'You have already selected the maximum number of seats');
    }
  };

  const calculateTotal = () => {
    let total = 0;
    Object.entries(selectedTickets).forEach(([ticketTypeId, quantity]) => {
      const ticketType = ticketTypes.find(tt => tt.id === parseInt(ticketTypeId));
      if (ticketType) {
        total += ticketType.base_price * quantity;
      }
    });
    return total;
  };

  const getTotalPassengers = () => {
    return Object.values(selectedTickets).reduce((sum, qty) => sum + qty, 0);
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      // Validate ticket selection
      if (getTotalPassengers() === 0) {
        Alert.alert('Selection Required', 'Please select at least one ticket');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // Validate passenger details
      const incompletePassengers = passengers.filter(p => !p.name.trim());
      if (incompletePassengers.length > 0) {
        Alert.alert('Missing Information', 'Please enter names for all passengers');
        return;
      }
      
      if (schedule?.boat.seat_mode === 'SEATMAP') {
        setCurrentStep(3); // Go to seat selection
      } else {
        setCurrentStep(4); // Skip to payment
      }
    } else if (currentStep === 3) {
      // Validate seat selection
      if (selectedSeats.length !== getTotalPassengers()) {
        Alert.alert('Seat Selection', `Please select ${getTotalPassengers()} seat(s)`);
        return;
      }
      setCurrentStep(4);
    }
  };

  const handleBooking = async () => {
    // Validate contact information
    if (!bookingData.buyer_name.trim() || !bookingData.buyer_phone.trim()) {
      Alert.alert('Missing Information', 'Please enter buyer contact information');
      return;
    }

    setIsCreating(true);

    try {
      // Prepare booking data
      const finalBookingData = {
        ...bookingData,
        passengers: passengers.map((passenger, index) => ({
          ...passenger,
          seat_id: schedule?.boat.seat_mode === 'SEATMAP' ? selectedSeats[index] : null,
        })),
      };

      const response = await apiService.createBooking(scheduleId, finalBookingData);
      
      if (response.success) {
        // Show payment modal for public users, or success for others
        if (user?.role === 'PUBLIC') {
          setShowPaymentModal(true);
        } else {
          Alert.alert(
            'Booking Created',
            'Your booking has been created successfully!',
            [
              {
                text: 'View Booking',
                onPress: () => navigation.navigate('ViewBooking', { bookingId: response.booking.id }),
              },
              {
                text: 'OK',
                onPress: () => navigation.navigate('MyBookings'),
              },
            ]
          );
        }
      } else {
        Alert.alert('Booking Error', response.error || 'Failed to create booking');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create booking');
    } finally {
      setIsCreating(false);
    }
  };

  const renderTicketSelection = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Select Tickets</Text>
      <Text style={styles.stepSubtitle}>Choose ticket types and quantities</Text>

      {ticketTypes.map(ticketType => (
        <View key={ticketType.id} style={styles.ticketCard}>
          <View style={styles.ticketInfo}>
            <Text style={styles.ticketName}>{ticketType.name}</Text>
            <Text style={styles.ticketCode}>{ticketType.code}</Text>
            <Text style={styles.ticketPrice}>
              {ticketType.currency} {ticketType.base_price.toFixed(2)}
            </Text>
            {ticketType.refundable && (
              <Text style={styles.refundableText}>Refundable</Text>
            )}
          </View>
          <View style={styles.ticketActions}>
            <TouchableOpacity
              style={styles.quantityBtn}
              onPress={() => {
                const current = selectedTickets[ticketType.id] || 0;
                if (current > 0) {
                  handleTicketSelection(ticketType.id, current - 1);
                }
              }}
            >
              <FontAwesome5 name="minus" size={12} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.quantityText}>
              {selectedTickets[ticketType.id] || 0}
            </Text>
            <TouchableOpacity
              style={styles.quantityBtn}
              onPress={() => {
                const current = selectedTickets[ticketType.id] || 0;
                handleTicketSelection(ticketType.id, current + 1);
              }}
            >
              <FontAwesome5 name="plus" size={12} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {getTotalPassengers() > 0 && (
        <View style={styles.selectionSummary}>
          <Text style={styles.summaryTitle}>Selection Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Passengers:</Text>
            <Text style={styles.summaryValue}>{getTotalPassengers()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Estimated Total:</Text>
            <Text style={styles.summaryValue}>MVR {calculateTotal().toFixed(2)}</Text>
          </View>
        </View>
      )}
    </View>
  );

  const renderPassengerDetails = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Passenger Details</Text>
      <Text style={styles.stepSubtitle}>Enter information for all passengers</Text>

      {passengers.map((passenger, index) => {
        const ticketType = ticketTypes.find(tt => tt.id === passenger.ticket_type_id);
        return (
          <View key={index} style={styles.passengerCard}>
            <Text style={styles.passengerTitle}>
              Passenger {index + 1} - {ticketType?.name}
            </Text>
            <View style={styles.passengerForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter passenger name"
                  value={passenger.name}
                  onChangeText={(value) => {
                    const updatedPassengers = [...passengers];
                    updatedPassengers[index].name = value;
                    setPassengers(updatedPassengers);
                  }}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter phone number (optional)"
                  value={passenger.phone}
                  onChangeText={(value) => {
                    const updatedPassengers = [...passengers];
                    updatedPassengers[index].phone = value;
                    setPassengers(updatedPassengers);
                  }}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );

  const renderSeatSelection = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Select Seats</Text>
      <Text style={styles.stepSubtitle}>
        Choose {getTotalPassengers()} seat{getTotalPassengers() !== 1 ? 's' : ''} for your passengers
      </Text>

      <View style={styles.seatMapContainer}>
        <View style={styles.seatMapLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendSeat, styles.availableSeat]} />
            <Text style={styles.legendText}>Available</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendSeat, styles.selectedSeat]} />
            <Text style={styles.legendText}>Selected</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendSeat, styles.occupiedSeat]} />
            <Text style={styles.legendText}>Occupied</Text>
          </View>
        </View>

        <View style={styles.seatMap}>
          {/* Render seat map based on boat configuration */}
          {seatMap.map(seat => (
            <TouchableOpacity
              key={seat.id}
              style={[
                styles.seatButton,
                seat.status === 'AVAILABLE' && styles.availableSeat,
                seat.status === 'OCCUPIED' && styles.occupiedSeat,
                seat.status === 'BLOCKED' && styles.blockedSeat,
                selectedSeats.includes(seat.id) && styles.selectedSeat,
              ]}
              onPress={() => handleSeatSelection(seat.id)}
              disabled={seat.status !== 'AVAILABLE'}
            >
              <Text style={[
                styles.seatText,
                selectedSeats.includes(seat.id) && styles.selectedSeatText
              ]}>
                {seat.number}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.seatSelectionSummary}>
          <Text style={styles.selectionInfo}>
            Selected: {selectedSeats.length} / {getTotalPassengers()} seats
          </Text>
        </View>
      </View>
    </View>
  );

  const renderPaymentDetails = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Contact & Payment</Text>
      <Text style={styles.stepSubtitle}>Enter contact details and choose payment method</Text>

      {/* Contact Information */}
      <View style={styles.contactSection}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Buyer Name *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter buyer name"
            value={bookingData.buyer_name}
            onChangeText={(value) => setBookingData(prev => ({ ...prev, buyer_name: value }))}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Phone Number *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter phone number"
            value={bookingData.buyer_phone}
            onChangeText={(value) => setBookingData(prev => ({ ...prev, buyer_phone: value }))}
            keyboardType="phone-pad"
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>National ID (Optional)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter national ID"
            value={bookingData.buyer_national_id}
            onChangeText={(value) => setBookingData(prev => ({ ...prev, buyer_national_id: value }))}
          />
        </View>
      </View>

      {/* Payment Methods (for public users) */}
      {user?.role === 'PUBLIC' && (
        <View style={styles.paymentSection}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.paymentMethods}>
            <TouchableOpacity
              style={[
                styles.paymentMethod,
                bookingData.payment_method === 'CARD' && styles.selectedPaymentMethod
              ]}
              onPress={() => setBookingData(prev => ({ ...prev, payment_method: 'CARD' }))}
            >
              <FontAwesome5 name="credit-card" size={20} color="#007AFF" />
              <Text style={styles.paymentMethodText}>Credit/Debit Card</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.paymentMethod,
                bookingData.payment_method === 'BANK' && styles.selectedPaymentMethod
              ]}
              onPress={() => setBookingData(prev => ({ ...prev, payment_method: 'BANK' }))}
            >
              <FontAwesome5 name="university" size={20} color="#007AFF" />
              <Text style={styles.paymentMethodText}>Bank Transfer</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.paymentMethod,
                bookingData.payment_method === 'MOBILE' && styles.selectedPaymentMethod
              ]}
              onPress={() => setBookingData(prev => ({ ...prev, payment_method: 'MOBILE' }))}
            >
              <FontAwesome5 name="mobile-alt" size={20} color="#007AFF" />
              <Text style={styles.paymentMethodText}>Mobile Payment</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Booking Summary */}
      <View style={styles.bookingSummary}>
        <Text style={styles.sectionTitle}>Booking Summary</Text>
        <View style={styles.summaryDetails}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Schedule:</Text>
            <Text style={styles.summaryValue}>{schedule?.name}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Date:</Text>
            <Text style={styles.summaryValue}>
              {schedule && new Date(schedule.date_time_start).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Passengers:</Text>
            <Text style={styles.summaryValue}>{getTotalPassengers()}</Text>
          </View>
          {schedule?.boat.seat_mode === 'SEATMAP' && selectedSeats.length > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Seats:</Text>
              <Text style={styles.summaryValue}>
                {selectedSeats.map(seatId => {
                  const seat = seatMap.find(s => s.id === seatId);
                  return seat?.number;
                }).join(', ')}
              </Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Amount:</Text>
            <Text style={styles.totalValue}>MVR {calculateTotal().toFixed(2)}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3, 4].map(step => {
        // Skip step 3 for capacity mode boats
        if (step === 3 && schedule?.boat.seat_mode !== 'SEATMAP') {
          return null;
        }
        
        const isActive = step === currentStep;
        const isCompleted = step < currentStep;
        
        return (
          <View key={step} style={styles.stepItem}>
            <View style={[
              styles.stepNumber,
              isActive && styles.activeStepNumber,
              isCompleted && styles.completedStepNumber,
            ]}>
              {isCompleted ? (
                <FontAwesome5 name="check" size={12} color="#FFF" />
              ) : (
                <Text style={[
                  styles.stepNumberText,
                  isActive && styles.activeStepNumberText,
                ]}>
                  {step}
                </Text>
              )}
            </View>
            <Text style={[
              styles.stepLabel,
              isActive && styles.activeStepLabel,
              isCompleted && styles.completedStepLabel,
            ]}>
              {step === 1 && 'Tickets'}
              {step === 2 && 'Passengers'}
              {step === 3 && 'Seats'}
              {step === 4 && 'Payment'}
            </Text>
          </View>
        );
      })}
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <FontAwesome5 name="spinner" size={24} color="#007AFF" />
          <Text style={styles.loadingText}>Loading booking flow...</Text>
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
          <Text style={styles.headerTitle}>Book Tickets</Text>
          <Text style={styles.headerSubtitle}>{schedule?.name}</Text>
        </View>
      </View>

      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Step Content */}
      <ScrollView style={styles.content}>
        {currentStep === 1 && renderTicketSelection()}
        {currentStep === 2 && renderPassengerDetails()}
        {currentStep === 3 && renderSeatSelection()}
        {currentStep === 4 && renderPaymentDetails()}
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.navigationButtons}>
        {currentStep > 1 && (
          <TouchableOpacity
            style={styles.backStepButton}
            onPress={() => setCurrentStep(prev => prev - 1)}
          >
            <FontAwesome5 name="arrow-left" size={16} color="#6B7280" />
            <Text style={styles.backStepButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        
        {currentStep < 4 ? (
          <TouchableOpacity
            style={[styles.nextButton, getTotalPassengers() === 0 && styles.disabledButton]}
            onPress={handleNextStep}
            disabled={getTotalPassengers() === 0}
          >
            <Text style={styles.nextButtonText}>Continue</Text>
            <FontAwesome5 name="arrow-right" size={16} color="#FFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.bookButton, isCreating && styles.disabledButton]}
            onPress={handleBooking}
            disabled={isCreating}
          >
            {isCreating ? (
              <Text style={styles.bookButtonText}>Creating Booking...</Text>
            ) : (
              <>
                <FontAwesome5 name="check" size={16} color="#FFF" />
                <Text style={styles.bookButtonText}>
                  {user?.role === 'PUBLIC' ? 'Proceed to Payment' : 'Create Booking'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Complete Payment</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowPaymentModal(false)}
            >
              <FontAwesome5 name="times" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <View style={styles.paymentSummary}>
              <Text style={styles.paymentAmount}>MVR {calculateTotal().toFixed(2)}</Text>
              <Text style={styles.paymentDescription}>
                {getTotalPassengers()} ticket{getTotalPassengers() !== 1 ? 's' : ''} for {schedule?.name}
              </Text>
            </View>
            
            <TouchableOpacity style={styles.payButton}>
              <FontAwesome5 name="credit-card" size={16} color="#FFF" />
              <Text style={styles.payButtonText}>Pay Now</Text>
            </TouchableOpacity>
            
            <Text style={styles.paymentNote}>
              You will receive your tickets via SMS and email after successful payment.
            </Text>
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
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },

  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 20,
  },
  stepItem: {
    alignItems: 'center',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  activeStepNumber: {
    backgroundColor: '#007AFF',
  },
  completedStepNumber: {
    backgroundColor: '#10B981',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeStepNumberText: {
    color: '#FFF',
  },
  stepLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  activeStepLabel: {
    color: '#007AFF',
    fontWeight: '600',
  },
  completedStepLabel: {
    color: '#10B981',
    fontWeight: '600',
  },

  content: {
    flex: 1,
  },
  stepContent: {
    padding: 16,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },

  // Ticket Selection Styles
  ticketCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  ticketInfo: {
    flex: 1,
  },
  ticketName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  ticketCode: {
    fontSize: 12,
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  ticketPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 4,
  },
  refundableText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  ticketActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    minWidth: 20,
    textAlign: 'center',
  },

  selectionSummary: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#1E40AF',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
  },

  // Passenger Details Styles
  passengerCard: {
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
  passengerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  passengerForm: {
    gap: 12,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFF',
  },

  // Seat Selection Styles
  seatMapContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  seatMapLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSeat: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#6B7280',
  },
  seatMap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  seatButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  availableSeat: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
  },
  selectedSeat: {
    backgroundColor: '#007AFF',
    borderColor: '#0056B3',
  },
  occupiedSeat: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
  },
  blockedSeat: {
    backgroundColor: '#F3F4F6',
    borderColor: '#9CA3AF',
  },
  seatText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  selectedSeatText: {
    color: '#FFF',
  },
  seatSelectionSummary: {
    alignItems: 'center',
  },
  selectionInfo: {
    fontSize: 14,
    color: '#6B7280',
  },

  // Payment Details Styles
  contactSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  paymentSection: {
    marginBottom: 20,
  },
  paymentMethods: {
    gap: 8,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 16,
    gap: 12,
  },
  selectedPaymentMethod: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F9FF',
  },
  paymentMethodText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },

  bookingSummary: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  summaryDetails: {
    gap: 8,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },

  // Navigation Buttons
  navigationButtons: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  backStepButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  backStepButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 2,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bookButton: {
    flex: 2,
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bookButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
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
  modalContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentSummary: {
    alignItems: 'center',
    marginBottom: 32,
  },
  paymentAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  paymentDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  payButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  payButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  paymentNote: {
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