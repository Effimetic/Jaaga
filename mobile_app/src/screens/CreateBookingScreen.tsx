import React, { useEffect, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { FontAwesome5 } from '@expo/vector-icons';
import { apiService } from '../services/apiService';

interface Schedule {
  id: number;
  name: string;
  schedule_date: string;
  boat: {
    name: string;
    total_seats: number;
  };
  available_seats: number;
  destinations: Array<{
    island_name: string;
    departure_time?: string;
  }>;
}

interface TicketType {
  id: number;
  name: string;
  code: string;
  final_price: number;
  base_price: number;
  currency: string;
  refundable: boolean;
}

interface Agent {
  id: number;
  name: string;
  phone: string;
}

export default function CreateBookingScreen({ navigation, route }: { navigation: any; route: any }) {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  
  const [bookingData, setBookingData] = useState({
    channel: 'PUBLIC',
    agent_id: '',
    buyer_name: '',
    buyer_phone: '',
    buyer_national_id: '',
    tickets: [] as Array<{
      ticket_type_id: number;
      passenger_name: string;
      passenger_phone: string;
      seat_no?: string;
    }>
  });

  const [selectedTickets, setSelectedTickets] = useState<{[key: number]: number}>({});

  const { scheduleId } = route.params || {};

  useEffect(() => {
    loadData();
  }, [scheduleId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      if (!scheduleId) {
        Alert.alert('Error', 'No schedule selected');
        navigation.goBack();
        return;
      }

      const [scheduleResponse, ticketTypesResponse, agentsResponse] = await Promise.all([
        apiService.getScheduleById(scheduleId),
        apiService.getScheduleTicketTypes(scheduleId),
        apiService.getAgents()
      ]);
      
      if (scheduleResponse.success) {
        setSchedule(scheduleResponse.data);
      }

      if (ticketTypesResponse.success) {
        setTicketTypes(ticketTypesResponse.data || []);
      }

      if (agentsResponse.success) {
        setAgents(agentsResponse.data || []);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTicketChange = (ticketTypeId: number, quantity: number) => {
    if (quantity === 0) {
      const newSelected = { ...selectedTickets };
      delete newSelected[ticketTypeId];
      setSelectedTickets(newSelected);
    } else {
      setSelectedTickets(prev => ({
        ...prev,
        [ticketTypeId]: quantity
      }));
    }
    
    // Update tickets array
    updateTicketsArray();
  };

  const updateTicketsArray = () => {
    const tickets: Array<{
      ticket_type_id: number;
      passenger_name: string;
      passenger_phone: string;
      seat_no?: string;
    }> = [];
    
    Object.entries(selectedTickets).forEach(([ticketTypeId, quantity]) => {
      for (let i = 0; i < quantity; i++) {
        tickets.push({
          ticket_type_id: parseInt(ticketTypeId),
          passenger_name: '',
          passenger_phone: '',
        });
      }
    });
    
    setBookingData(prev => ({ ...prev, tickets }));
  };

  const updateTicketPassenger = (index: number, field: string, value: string) => {
    setBookingData(prev => ({
      ...prev,
      tickets: prev.tickets.map((ticket, i) => 
        i === index ? { ...ticket, [field]: value } : ticket
      )
    }));
  };

  const getTotalPassengers = () => {
    return Object.values(selectedTickets).reduce((sum, quantity) => sum + quantity, 0);
  };

  const getTotalPrice = () => {
    let total = 0;
    Object.entries(selectedTickets).forEach(([ticketTypeId, quantity]) => {
      const ticketType = ticketTypes.find(tt => tt.id === parseInt(ticketTypeId));
      if (ticketType) {
        total += (ticketType.final_price || ticketType.base_price) * quantity;
      }
    });
    return total;
  };

  const handleSubmit = async () => {
    // Validation
    if (getTotalPassengers() === 0) {
      Alert.alert('Error', 'Please select at least one ticket');
      return;
    }

    if (!bookingData.buyer_name.trim()) {
      Alert.alert('Error', 'Please enter buyer name');
      return;
    }

    if (!bookingData.buyer_phone.trim()) {
      Alert.alert('Error', 'Please enter buyer phone number');
      return;
    }

    // Check if all passengers have names
    const incompleteTickets = bookingData.tickets.filter(ticket => !ticket.passenger_name.trim());
    if (incompleteTickets.length > 0) {
      Alert.alert('Error', 'Please enter names for all passengers');
      return;
    }

    if (bookingData.channel === 'AGENT' && !bookingData.agent_id) {
      Alert.alert('Error', 'Please select an agent');
      return;
    }

    setIsCreating(true);

    try {
      const response = await apiService.createBooking(scheduleId, bookingData);
      
      if (response.success) {
        Alert.alert(
          'Success',
          'Booking created successfully!',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('Error', response.error || 'Failed to create booking');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create booking');
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <FontAwesome5 name="spinner" size={24} color="#007AFF" />
          <Text style={styles.loadingText}>Loading...</Text>
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
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <FontAwesome5 name="arrow-left" size={20} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Booking</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Schedule Info */}
        <View style={styles.scheduleCard}>
          <Text style={styles.scheduleTitle}>{schedule.name}</Text>
          <Text style={styles.scheduleDate}>
            {new Date(schedule.schedule_date).toLocaleDateString()}
          </Text>
          <Text style={styles.scheduleBoat}>Boat: {schedule.boat.name}</Text>
          <Text style={styles.scheduleSeats}>
            Available: {schedule.available_seats} / {schedule.boat.total_seats} seats
          </Text>
        </View>

        {/* Channel Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Booking Channel</Text>
          <View style={styles.channelContainer}>
            <TouchableOpacity
              style={[
                styles.channelOption,
                bookingData.channel === 'PUBLIC' && styles.selectedChannel
              ]}
              onPress={() => setBookingData(prev => ({ ...prev, channel: 'PUBLIC', agent_id: '' }))}
            >
              <FontAwesome5 name="globe" size={16} color={bookingData.channel === 'PUBLIC' ? "#007AFF" : "#6B7280"} />
              <Text style={[
                styles.channelText,
                bookingData.channel === 'PUBLIC' && styles.selectedChannelText
              ]}>
                Public
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.channelOption,
                bookingData.channel === 'AGENT' && styles.selectedChannel
              ]}
              onPress={() => setBookingData(prev => ({ ...prev, channel: 'AGENT' }))}
            >
              <FontAwesome5 name="user-tie" size={16} color={bookingData.channel === 'AGENT' ? "#007AFF" : "#6B7280"} />
              <Text style={[
                styles.channelText,
                bookingData.channel === 'AGENT' && styles.selectedChannelText
              ]}>
                Agent
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.channelOption,
                bookingData.channel === 'OWNER' && styles.selectedChannel
              ]}
              onPress={() => setBookingData(prev => ({ ...prev, channel: 'OWNER', agent_id: '' }))}
            >
              <FontAwesome5 name="crown" size={16} color={bookingData.channel === 'OWNER' ? "#007AFF" : "#6B7280"} />
              <Text style={[
                styles.channelText,
                bookingData.channel === 'OWNER' && styles.selectedChannelText
              ]}>
                Owner
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Agent Selection */}
        {bookingData.channel === 'AGENT' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Agent</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={bookingData.agent_id}
                onValueChange={(value) => setBookingData(prev => ({ ...prev, agent_id: value }))}
                style={styles.picker}
              >
                <Picker.Item label="Choose an agent..." value="" />
                {agents.map(agent => (
                  <Picker.Item 
                    key={agent.id} 
                    label={`${agent.name} (${agent.phone})`} 
                    value={agent.id.toString()} 
                  />
                ))}
              </Picker>
            </View>
          </View>
        )}

        {/* Ticket Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Tickets</Text>
          {ticketTypes.map(ticketType => (
            <View key={ticketType.id} style={styles.ticketCard}>
              <View style={styles.ticketInfo}>
                <Text style={styles.ticketName}>{ticketType.name}</Text>
                <Text style={styles.ticketCode}>{ticketType.code}</Text>
                <Text style={styles.ticketPrice}>
                  {ticketType.currency} {ticketType.final_price || ticketType.base_price}
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
                      handleTicketChange(ticketType.id, current - 1);
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
                    handleTicketChange(ticketType.id, current + 1);
                  }}
                >
                  <FontAwesome5 name="plus" size={12} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Passenger Details */}
        {getTotalPassengers() > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Passenger Details</Text>
            {bookingData.tickets.map((ticket, index) => {
              const ticketType = ticketTypes.find(tt => tt.id === ticket.ticket_type_id);
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
                        value={ticket.passenger_name}
                        onChangeText={(value) => updateTicketPassenger(index, 'passenger_name', value)}
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Phone Number</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Enter phone number"
                        value={ticket.passenger_phone}
                        onChangeText={(value) => updateTicketPassenger(index, 'passenger_phone', value)}
                        keyboardType="phone-pad"
                      />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Contact Information */}
        <View style={styles.section}>
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
            <Text style={styles.inputLabel}>Buyer Phone *</Text>
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

        {/* Summary */}
        {getTotalPassengers() > 0 && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Booking Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Passengers:</Text>
              <Text style={styles.summaryValue}>{getTotalPassengers()}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Amount:</Text>
              <Text style={styles.summaryValue}>MVR {getTotalPrice().toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Channel:</Text>
              <Text style={styles.summaryValue}>{bookingData.channel}</Text>
            </View>
          </View>
        )}

        {/* Submit Button */}
        {getTotalPassengers() > 0 && (
          <TouchableOpacity 
            style={[styles.submitButton, isCreating && styles.disabledButton]} 
            onPress={handleSubmit}
            disabled={isCreating}
          >
            {isCreating ? (
              <Text style={styles.submitButtonText}>Creating Booking...</Text>
            ) : (
              <>
                <FontAwesome5 name="check" size={16} color="#FFF" />
                <Text style={styles.submitButtonText}>Create Booking</Text>
              </>
            )}
          </TouchableOpacity>
        )}
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

  scheduleCard: {
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
  scheduleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  scheduleDate: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  scheduleBoat: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  scheduleSeats: {
    fontSize: 14,
    color: '#6B7280',
  },

  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },

  channelContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  channelOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    gap: 8,
    justifyContent: 'center',
  },
  selectedChannel: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F9FF',
  },
  channelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  selectedChannelText: {
    color: '#007AFF',
  },

  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFF',
    overflow: 'hidden',
  },
  picker: {
    height: 48,
  },

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
    fontSize: 14,
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

  summaryCard: {
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
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },

  submitButton: {
    backgroundColor: '#007AFF',
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
  submitButtonText: {
    color: '#FFF',
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