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
import { FontAwesome5 } from '@expo/vector-icons';
import { apiService } from '../services/apiService';

export default function BookTicketsScreen({ navigation, route }: { navigation: any; route: any }) {
  const [schedule, setSchedule] = useState<any>(null);
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [selectedTickets, setSelectedTickets] = useState<{[key: number]: number}>({});
  const [passengers, setPassengers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

      // Load schedule details
      const scheduleResponse = await apiService.getScheduleById(scheduleId);
      if (scheduleResponse.success) {
        setSchedule(scheduleResponse.data);
      }

      // Load ticket types
      const ticketTypesResponse = await apiService.getScheduleTicketTypes(scheduleId);
      if (ticketTypesResponse.success) {
        setTicketTypes(ticketTypesResponse.data || []);
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
    if (getTotalPassengers() === 0) {
      Alert.alert('Error', 'Please select at least one ticket');
      return;
    }

    Alert.alert('Success', 'Booking functionality will be implemented');
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
          <Text style={styles.headerTitle}>Book Tickets</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Schedule Info */}
        {schedule && (
          <View style={styles.scheduleCard}>
            <Text style={styles.scheduleTitle}>{schedule.name}</Text>
            <Text style={styles.scheduleDate}>
              {new Date(schedule.schedule_date).toLocaleDateString()}
            </Text>
            <Text style={styles.scheduleBoat}>Boat: {schedule.boat?.name}</Text>
          </View>
        )}

        {/* Ticket Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Tickets</Text>
          {ticketTypes.map(ticketType => (
            <View key={ticketType.id} style={styles.ticketCard}>
              <View style={styles.ticketInfo}>
                <Text style={styles.ticketName}>{ticketType.name}</Text>
                <Text style={styles.ticketPrice}>
                  {ticketType.currency} {ticketType.final_price || ticketType.base_price}
                </Text>
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

        {/* Summary */}
        {getTotalPassengers() > 0 && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Booking Summary</Text>
            <View style={styles.summaryRow}>
              <Text>Total Passengers:</Text>
              <Text style={styles.summaryValue}>{getTotalPassengers()}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text>Total Amount:</Text>
              <Text style={styles.summaryValue}>MVR {getTotalPrice()}</Text>
            </View>
          </View>
        )}

        {/* Submit Button */}
        {getTotalPassengers() > 0 && (
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <FontAwesome5 name="check" size={16} color="#FFF" />
            <Text style={styles.submitButtonText}>Confirm Booking</Text>
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
  ticketPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
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
  summaryValue: {
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
});
