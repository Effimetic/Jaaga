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

interface Schedule {
  id: number;
  name: string;
  schedule_date: string;
  boat: {
    name: string;
  };
  available_seats: number;
  total_seats: number;
  destinations: Array<{
    island_name: string;
  }>;
}

export default function SchedulesScreen({ navigation, route }: { navigation: any; route: any }) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchParams, setSearchParams] = useState<any>(null);

  useEffect(() => {
    if (route.params) {
      setSearchParams(route.params);
    }
    loadSchedules();
  }, [route.params]);

  const loadSchedules = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getSchedules({
        start_date: searchParams?.date,
        // Add other search parameters as needed
      });
      if (response.success) {
        setSchedules(response.schedules || response.data || []);
      } else {
        Alert.alert('Error', 'Failed to load schedules');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load schedules');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSchedulePress = (schedule: Schedule) => {
    navigation.navigate('BookTickets', { scheduleId: schedule.id });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const renderScheduleItem = ({ item }: { item: Schedule }) => (
    <TouchableOpacity
      style={styles.scheduleCard}
      onPress={() => handleSchedulePress(item)}
    >
      <View style={styles.scheduleHeader}>
        <Text style={styles.scheduleName}>{item.name}</Text>
        <View style={styles.seatsInfo}>
          <FontAwesome5 name="chair" size={14} color="#6B7280" />
          <Text style={styles.seatsText}>
            {item.available_seats} / {item.total_seats} seats
          </Text>
        </View>
      </View>
      
      <View style={styles.scheduleDetails}>
        <View style={styles.detailRow}>
          <FontAwesome5 name="ship" size={14} color="#6B7280" />
          <Text style={styles.detailText}>{item.boat.name}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <FontAwesome5 name="calendar" size={14} color="#6B7280" />
          <Text style={styles.detailText}>{formatDate(item.schedule_date)}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <FontAwesome5 name="route" size={14} color="#6B7280" />
          <Text style={styles.detailText}>
            {item.destinations.map((dest, index) => 
              `${dest.island_name}${index < item.destinations.length - 1 ? ' → ' : ''}`
            ).join('')}
          </Text>
        </View>
      </View>

      <View style={styles.bookButton}>
        <FontAwesome5 name="ticket-alt" size={14} color="#FFF" />
        <Text style={styles.bookButtonText}>Book Tickets</Text>
      </View>
    </TouchableOpacity>
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
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <FontAwesome5 name="arrow-left" size={20} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Available Schedules</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Summary */}
      {searchParams && (
        <View style={styles.searchSummary}>
          <Text style={styles.searchTitle}>Search Results</Text>
          <Text style={styles.searchText}>
            From: {searchParams.from} → To: {searchParams.to}
          </Text>
          <Text style={styles.searchText}>
            Date: {searchParams.date} • Passengers: {searchParams.passengers}
          </Text>
        </View>
      )}

      {/* Schedules List */}
      {schedules.length > 0 ? (
        <FlatList
          data={schedules}
          renderItem={renderScheduleItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.schedulesList}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <FontAwesome5 name="calendar-times" size={48} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>No Schedules Available</Text>
          <Text style={styles.emptyText}>
            There are no schedules available for the selected criteria.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FA' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: { padding: 8 },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  placeholder: { width: 36 },

  searchSummary: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 8,
    padding: 16,
    margin: 16,
  },
  searchTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 8,
  },
  searchText: {
    fontSize: 14,
    color: '#1E40AF',
    marginBottom: 4,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scheduleName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  seatsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  seatsText: {
    fontSize: 14,
    color: '#6B7280',
  },

  scheduleDetails: {
    gap: 8,
    marginBottom: 16,
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

  bookButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
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
  emptyText: {
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
