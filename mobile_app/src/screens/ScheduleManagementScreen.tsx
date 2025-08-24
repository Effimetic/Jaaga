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
import DateTimePicker from '@react-native-community/datetimepicker';

interface Schedule {
  id: number;
  name: string;
  schedule_date: string;
  boat: {
    id: number;
    name: string;
  };
  total_seats: number;
  available_seats: number;
  status: string;
  confirmation_type: string;
  is_public: boolean;
  destinations: Array<{
    id: number;
    island_name: string;
    departure_time?: string;
    arrival_time?: string;
    is_pickup: boolean;
    is_dropoff: boolean;
  }>;
  created_at: string;
}

interface Boat {
  id: number;
  name: string;
  total_seats: number;
  seating_type: string;
}

export default function ScheduleManagementScreen({ navigation }: { navigation: any }) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [newSchedule, setNewSchedule] = useState({
    schedule_date: new Date(),
    boat_id: '',
    destinations: [{ island_name: '', departure_time: '', arrival_time: '', is_pickup: true, is_dropoff: true }],
    schedule_name: '',
    confirmation_type: 'immediate',
    is_public: true
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [schedulesResponse, boatsResponse] = await Promise.all([
        apiService.getSchedules(),
        apiService.getBoats()
      ]);
      
      if (schedulesResponse.success) {
        setSchedules(schedulesResponse.data || []);
      }
      
      if (boatsResponse.success) {
        setBoats(boatsResponse.data || []);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSchedule = async () => {
    try {
      const scheduleData = {
        ...newSchedule,
        schedule_date: newSchedule.schedule_date.toISOString().split('T')[0]
      };

      const response = await apiService.createSchedule(scheduleData);
      
      if (response.success) {
        Alert.alert('Success', 'Schedule created successfully');
        setShowCreateModal(false);
        resetCreateForm();
        loadData();
      } else {
        Alert.alert('Error', response.error || 'Failed to create schedule');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create schedule');
    }
  };

  const resetCreateForm = () => {
    setCreateStep(1);
    setNewSchedule({
      schedule_date: new Date(),
      boat_id: '',
      destinations: [{ island_name: '', departure_time: '', arrival_time: '', is_pickup: true, is_dropoff: true }],
      schedule_name: '',
      confirmation_type: 'immediate',
      is_public: true
    });
  };

  const addDestination = () => {
    setNewSchedule(prev => ({
      ...prev,
      destinations: [...prev.destinations, { island_name: '', departure_time: '', arrival_time: '', is_pickup: true, is_dropoff: true }]
    }));
  };

  const removeDestination = (index: number) => {
    if (newSchedule.destinations.length > 1) {
      setNewSchedule(prev => ({
        ...prev,
        destinations: prev.destinations.filter((_, i) => i !== index)
      }));
    }
  };

  const updateDestination = (index: number, field: string, value: any) => {
    setNewSchedule(prev => ({
      ...prev,
      destinations: prev.destinations.map((dest, i) => 
        i === index ? { ...dest, [field]: value } : dest
      )
    }));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
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

  const renderScheduleCard = ({ item }: { item: Schedule }) => (
    <TouchableOpacity
      style={styles.scheduleCard}
      onPress={() => navigation.navigate('ViewSchedule', { scheduleId: item.id })}
    >
      <View style={styles.scheduleHeader}>
        <View style={styles.scheduleInfo}>
          <Text style={styles.scheduleName}>{item.name}</Text>
          <Text style={styles.scheduleDate}>{formatDate(item.schedule_date)}</Text>
          <Text style={styles.scheduleBoat}>{item.boat.name}</Text>
        </View>
        <View style={styles.scheduleStatus}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) }
          ]}>
            <Text style={styles.statusText}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.scheduleDetails}>
        <View style={styles.detailRow}>
          <FontAwesome5 name="chair" size={14} color="#6B7280" />
          <Text style={styles.detailText}>
            {item.available_seats} / {item.total_seats} seats available
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <FontAwesome5 name="route" size={14} color="#6B7280" />
          <Text style={styles.detailText}>
            {item.destinations.map(d => d.island_name).join(' → ')}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <FontAwesome5 name="eye" size={14} color="#6B7280" />
          <Text style={styles.detailText}>
            {item.is_public ? 'Public' : 'Private'}
          </Text>
        </View>
      </View>

      <View style={styles.scheduleActions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionPrimary]}
          onPress={() => navigation.navigate('ViewSchedule', { scheduleId: item.id })}
        >
          <FontAwesome5 name="eye" size={14} color="#FFF" />
          <Text style={styles.actionText}>View</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionSecondary]}
          onPress={() => navigation.navigate('EditSchedule', { scheduleId: item.id })}
        >
          <FontAwesome5 name="edit" size={14} color="#007AFF" />
          <Text style={[styles.actionText, styles.actionTextSecondary]}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionSuccess]}
          onPress={() => navigation.navigate('ScheduleBookings', { scheduleId: item.id })}
        >
          <FontAwesome5 name="ticket-alt" size={14} color="#FFF" />
          <Text style={styles.actionText}>Bookings</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderCreateModal = () => (
    <Modal
      visible={showCreateModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowCreateModal(false)}
    >
      <SafeAreaView style={styles.modalSafe}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowCreateModal(false)}
          >
            <FontAwesome5 name="times" size={20} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Create Schedule - Step {createStep} of 3</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.modalContent}>
          {createStep === 1 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Select Date</Text>
              
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <FontAwesome5 name="calendar" size={16} color="#007AFF" />
                <Text style={styles.dateButtonText}>
                  {newSchedule.schedule_date.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={newSchedule.schedule_date}
                  mode="date"
                  display="default"
                  minimumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) {
                      setNewSchedule(prev => ({ ...prev, schedule_date: selectedDate }));
                    }
                  }}
                />
              )}

              <TouchableOpacity
                style={styles.nextButton}
                onPress={() => setCreateStep(2)}
              >
                <Text style={styles.nextButtonText}>Continue to Boat Selection</Text>
                <FontAwesome5 name="arrow-right" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          )}

          {createStep === 2 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Select Boat</Text>
              
              {boats.map(boat => (
                <TouchableOpacity
                  key={boat.id}
                  style={[
                    styles.boatOption,
                    newSchedule.boat_id === boat.id.toString() && styles.selectedBoatOption
                  ]}
                  onPress={() => setNewSchedule(prev => ({ ...prev, boat_id: boat.id.toString() }))}
                >
                  <View style={styles.boatOptionInfo}>
                    <Text style={styles.boatOptionName}>{boat.name}</Text>
                    <Text style={styles.boatOptionDetails}>
                      {boat.total_seats} seats • {boat.seating_type === 'chart' ? 'Chart-based' : 'Total count'}
                    </Text>
                  </View>
                  {newSchedule.boat_id === boat.id.toString() && (
                    <FontAwesome5 name="check-circle" size={20} color="#10B981" />
                  )}
                </TouchableOpacity>
              ))}

              <View style={styles.stepActions}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setCreateStep(1)}
                >
                  <FontAwesome5 name="arrow-left" size={16} color="#6B7280" />
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.nextButton, !newSchedule.boat_id && styles.disabledButton]}
                  onPress={() => setCreateStep(3)}
                  disabled={!newSchedule.boat_id}
                >
                  <Text style={styles.nextButtonText}>Continue to Destinations</Text>
                  <FontAwesome5 name="arrow-right" size={16} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {createStep === 3 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Configure Destinations</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Schedule Name</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Auto-generated from destinations"
                  value={newSchedule.schedule_name}
                  onChangeText={(value) => setNewSchedule(prev => ({ ...prev, schedule_name: value }))}
                />
              </View>

              {newSchedule.destinations.map((destination, index) => (
                <View key={index} style={styles.destinationCard}>
                  <View style={styles.destinationHeader}>
                    <Text style={styles.destinationTitle}>Destination {index + 1}</Text>
                    {newSchedule.destinations.length > 1 && (
                      <TouchableOpacity
                        style={styles.removeDestinationButton}
                        onPress={() => removeDestination(index)}
                      >
                        <FontAwesome5 name="trash" size={14} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Island Name *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter island name"
                      value={destination.island_name}
                      onChangeText={(value) => updateDestination(index, 'island_name', value)}
                    />
                  </View>
                  
                  <View style={styles.timeRow}>
                    <View style={styles.timeInput}>
                      <Text style={styles.inputLabel}>Departure Time</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="HH:MM"
                        value={destination.departure_time}
                        onChangeText={(value) => updateDestination(index, 'departure_time', value)}
                      />
                    </View>
                    <View style={styles.timeInput}>
                      <Text style={styles.inputLabel}>Arrival Time</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="HH:MM"
                        value={destination.arrival_time}
                        onChangeText={(value) => updateDestination(index, 'arrival_time', value)}
                      />
                    </View>
                  </View>
                  
                  <View style={styles.checkboxRow}>
                    <TouchableOpacity
                      style={styles.checkbox}
                      onPress={() => updateDestination(index, 'is_pickup', !destination.is_pickup)}
                    >
                      <FontAwesome5 
                        name={destination.is_pickup ? "check-square" : "square"} 
                        size={16} 
                        color={destination.is_pickup ? "#007AFF" : "#9CA3AF"} 
                      />
                      <Text style={styles.checkboxLabel}>Pickup Point</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.checkbox}
                      onPress={() => updateDestination(index, 'is_dropoff', !destination.is_dropoff)}
                    >
                      <FontAwesome5 
                        name={destination.is_dropoff ? "check-square" : "square"} 
                        size={16} 
                        color={destination.is_dropoff ? "#007AFF" : "#9CA3AF"} 
                      />
                      <Text style={styles.checkboxLabel}>Dropoff Point</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <TouchableOpacity style={styles.addDestinationButton} onPress={addDestination}>
                <FontAwesome5 name="plus" size={16} color="#007AFF" />
                <Text style={styles.addDestinationText}>Add Destination</Text>
              </TouchableOpacity>

              <View style={styles.stepActions}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setCreateStep(2)}
                >
                  <FontAwesome5 name="arrow-left" size={16} color="#6B7280" />
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.createButton}
                  onPress={handleCreateSchedule}
                >
                  <FontAwesome5 name="check" size={16} color="#FFF" />
                  <Text style={styles.createButtonText}>Create Schedule</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <FontAwesome5 name="calendar-times" size={48} color="#9CA3AF" />
      </View>
      <Text style={styles.emptyTitle}>No Schedules Yet</Text>
      <Text style={styles.emptyDescription}>
        You haven't created any schedules yet. Start by creating your first schedule!
      </Text>
      <TouchableOpacity
        style={styles.emptyActionBtn}
        onPress={() => setShowCreateModal(true)}
      >
        <FontAwesome5 name="plus" size={16} color="#FFF" />
        <Text style={styles.emptyActionText}>Create First Schedule</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <FontAwesome5 name="spinner" size={24} color="#007AFF" />
          <Text style={styles.loadingText}>Loading schedules...</Text>
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
          <Text style={styles.pageTitle}>Schedule Management</Text>
          <Text style={styles.pageSubtitle}>Manage your boat schedules</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowCreateModal(true)}
        >
          <FontAwesome5 name="plus" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Stats Summary */}
      <View style={styles.statsSummary}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{schedules.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {schedules.filter(s => s.status === 'published').length}
          </Text>
          <Text style={styles.statLabel}>Published</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {schedules.filter(s => s.status === 'draft').length}
          </Text>
          <Text style={styles.statLabel}>Draft</Text>
        </View>
      </View>

      {/* Schedules List */}
      {schedules.length > 0 ? (
        <FlatList
          data={schedules}
          renderItem={renderScheduleCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.schedulesList}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        renderEmptyState()
      )}

      {renderCreateModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FA' },

  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
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
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
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

  schedulesList: {
    padding: 16,
    gap: 12,
  },

  scheduleCard: {
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
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  scheduleDate: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 2,
  },
  scheduleBoat: {
    fontSize: 13,
    color: '#6B7280',
  },
  scheduleStatus: {
    marginLeft: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFF',
  },

  scheduleDetails: {
    gap: 6,
    marginBottom: 16,
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

  scheduleActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  actionPrimary: {
    backgroundColor: '#007AFF',
  },
  actionSecondary: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  actionSuccess: {
    backgroundColor: '#10B981',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  actionTextSecondary: {
    color: '#007AFF',
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
  modalContent: {
    flex: 1,
    padding: 16,
  },

  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
  },

  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 16,
    gap: 12,
    marginBottom: 20,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },

  boatOption: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedBoatOption: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  boatOptionInfo: {
    flex: 1,
  },
  boatOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  boatOptionDetails: {
    fontSize: 14,
    color: '#6B7280',
  },

  destinationCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  destinationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  destinationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  removeDestinationButton: {
    padding: 8,
  },

  inputGroup: {
    marginBottom: 16,
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

  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeInput: {
    flex: 1,
  },

  checkboxRow: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 8,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#374151',
  },

  addDestinationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    gap: 8,
    marginBottom: 20,
    justifyContent: 'center',
  },
  addDestinationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },

  stepActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  backButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  backButtonText: {
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
  createButton: {
    flex: 2,
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  createButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
});