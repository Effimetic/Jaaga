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
import { useAuth } from '../contexts/AuthContext';

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
    departure_time?: string;
    is_pickup: boolean;
    is_dropoff: boolean;
  }>;
  owner?: {
    id: number;
    name: string;
  };
  min_price?: number;
  currency?: string;
}

export default function SchedulesScreen({ navigation, route }: { navigation: any; route: any }) {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<Schedule[]>([]);
  const [searchParams, setSearchParams] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'search' | 'all'>('search');

  useEffect(() => {
    if (route.params?.searchResults) {
      setSearchResults(route.params.searchResults);
      setSearchParams(route.params);
      setActiveTab('search');
    } else if (route.params?.searchParams) {
      setSearchParams(route.params.searchParams);
      loadSearchResults();
    }
    
    if (user) {
      loadAllSchedules();
    }
  }, [route.params, user]);

  const loadSearchResults = async () => {
    if (!searchParams) return;
    
    try {
      const response = await apiService.searchSchedules({
        from: searchParams.from,
        to: searchParams.to,
        date: searchParams.date,
        passengers: searchParams.passengers
      });
      
      if (response.success) {
        setSearchResults(response.data || []);
      }
    } catch (error: any) {
      console.error('Error loading search results:', error);
    }
  };

  const loadAllSchedules = async () => {
    try {
      setIsLoading(true);
      
      let response;
      if (user?.role === 'agent') {
        response = await apiService.getAgentSchedules();
      } else {
        response = await apiService.getSchedules();
      }
      
      if (response.success) {
        setSchedules(response.data || []);
      } else {
        console.error('Failed to load schedules:', response.error);
      }
    } catch (error: any) {
      console.error('Error loading schedules:', error);
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
        {item.min_price && (
          <View style={styles.priceTag}>
            <Text style={styles.priceText}>
              {item.currency} {item.min_price}
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.scheduleHeader}>
        <View style={styles.seatsInfo}>
          <FontAwesome5 name="chair" size={14} color="#6B7280" />
          <Text style={styles.seatsText}>
            {item.available_seats} / {item.total_seats} seats
          </Text>
        </View>
        {item.owner && (
          <View style={styles.ownerInfo}>
            <FontAwesome5 name="user" size={12} color="#6B7280" />
            <Text style={styles.ownerText}>{item.owner.name}</Text>
          </View>
        )}
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
            {item.destinations
              .filter(dest => dest.is_pickup || dest.is_dropoff)
              .map((dest, index, filtered) => 
                `${dest.island_name}${index < filtered.length - 1 ? ' → ' : ''}`
              ).join('')}
          </Text>
        </View>
        
        {item.destinations.some(dest => dest.departure_time) && (
          <View style={styles.detailRow}>
            <FontAwesome5 name="clock" size={14} color="#6B7280" />
            <Text style={styles.detailText}>
              Departs: {item.destinations.find(dest => dest.departure_time)?.departure_time || 'TBD'}
            </Text>
          </View>
        )}
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
        <View style={styles.headerText}>
          <Text style={styles.pageTitle}>
            {searchParams ? 'Search Results' : 'Available Schedules'}
          </Text>
          <Text style={styles.pageSubtitle}>
            {searchParams ? 'Schedules matching your search' : 'Browse all available schedules'}
          </Text>
      {searchParams && searchParams.from && (
        <View style={styles.searchSummary}>
          <Text style={styles.searchTitle}>Search Results</Text>
          <Text style={styles.searchText}>
            {searchParams.from} → {searchParams.to}
          </Text>
          <Text style={styles.searchText}>
            Date: {searchParams.date} • Passengers: {searchParams.passengers}
          </Text>
        </View>
      )}
      
      {/* Tabs for logged in users */}
      {user && (
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'search' && styles.activeTab]}
            onPress={() => setActiveTab('search')}
          >
            <Text style={[styles.tabText, activeTab === 'search' && styles.activeTabText]}>
              Search Results
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'all' && styles.activeTab]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
              {user.role === 'agent' ? 'Available Schedules' : 'My Schedules'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Schedules List */}
      {(() => {
        const currentSchedules = activeTab === 'search' ? searchResults : schedules;
        
        if (isLoading && activeTab === 'all') {
          return (
            <View style={styles.loadingContainer}>
              <FontAwesome5 name="spinner" size={24} color="#007AFF" />
              <Text style={styles.loadingText}>Loading schedules...</Text>
            </View>
          );
        }
        
        if (currentSchedules.length > 0) {
          return (
            <FlatList
              data={currentSchedules}
              renderItem={renderScheduleItem}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.schedulesList}
              showsVerticalScrollIndicator={false}
            />
          );
        }
        
        return (
          <View style={styles.emptyState}>
            <FontAwesome5 name="calendar-times" size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>
              {activeTab === 'search' ? 'No Search Results' : 'No Schedules Available'}
            </Text>
            <Text style={styles.emptyText}>
              {activeTab === 'search' 
                ? 'No schedules found for your search criteria. Try different dates or destinations.'
                : 'There are no schedules available at the moment.'
              }
            </Text>
            {activeTab === 'search' && (
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => navigation.navigate('Home')}
              >
                <FontAwesome5 name="search" size={16} color="#FFF" />
                <Text style={styles.emptyActionText}>New Search</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FA' },

  pageHeader: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: { 
    padding: 8,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
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
    marginBottom: 8,
  },
  scheduleName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  priceTag: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  priceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  seatsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  seatsText: {
    fontSize: 13,
    color: '#6B7280',
  },
  ownerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 12,
  },
  ownerText: {
    fontSize: 12,
    color: '#6B7280',
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
    fontSize: 14,
    fontWeight: '600',
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
  emptyText: {
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
});

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
