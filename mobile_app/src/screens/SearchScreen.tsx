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
  Modal,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { apiService } from '../services/apiService';
import { SearchParams, SearchResult } from '../types';

export default function SearchScreen({ navigation }: { navigation: any }) {
  const [searchMode, setSearchMode] = useState<'BOAT' | 'DESTINATION'>('DESTINATION');
  const [searchParams, setSearchParams] = useState<SearchParams>({
    mode: 'DESTINATION',
    from: '',
    to: '',
    date: new Date().toISOString().split('T')[0],
    passengers: 1,
  });
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [popularDestinations, setPopularDestinations] = useState<string[]>([]);

  useEffect(() => {
    loadPopularDestinations();
  }, []);

  const loadPopularDestinations = async () => {
    try {
      const response = await apiService.getDestinations();
      if (response.success) {
        setPopularDestinations(response.data.map((dest: any) => dest.name));
      }
    } catch (error) {
      console.error('Failed to load destinations:', error);
    }
  };

  const handleSearch = async () => {
    if (searchMode === 'DESTINATION' && (!searchParams.from || !searchParams.to)) {
      Alert.alert('Missing Information', 'Please select both pickup and dropoff locations');
      return;
    }

    if (!searchParams.date) {
      Alert.alert('Missing Information', 'Please select a travel date');
      return;
    }

    setIsSearching(true);

    try {
      const response = await apiService.searchSchedules({
        ...searchParams,
        mode: searchMode,
      });

      if (response.success) {
        setSearchResults(response.data || []);
        if (response.data.length === 0) {
          Alert.alert('No Results', 'No trips found for your search criteria. Try different dates or destinations.');
        }
      } else {
        Alert.alert('Search Error', response.error || 'Failed to search trips');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to search trips');
    } finally {
      setIsSearching(false);
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

  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderSearchResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={styles.resultCard}
      onPress={() => navigation.navigate('BookingFlow', { 
        scheduleId: item.schedule.id,
        segmentId: item.segments[0]?.id 
      })}
    >
      <View style={styles.resultHeader}>
        <View style={styles.resultInfo}>
          <Text style={styles.resultTitle}>{item.schedule.name}</Text>
          <Text style={styles.resultDate}>{formatDate(item.schedule.date_time_start)}</Text>
          <Text style={styles.resultBoat}>{item.schedule.boat.name}</Text>
        </View>
        <View style={styles.resultPrice}>
          <Text style={styles.priceText}>From</Text>
          <Text style={styles.priceAmount}>{item.currency} {item.min_price}</Text>
        </View>
      </View>

      <View style={styles.resultRoute}>
        <View style={styles.routeSegments}>
          {item.segments.map((segment, index) => (
            <View key={segment.id} style={styles.routeSegment}>
              <View style={styles.segmentDot} />
              <View style={styles.segmentInfo}>
                <Text style={styles.segmentLocation}>{segment.pickup}</Text>
                <Text style={styles.segmentTime}>{formatTime(segment.eta)}</Text>
              </View>
              {index < item.segments.length - 1 && (
                <View style={styles.segmentLine} />
              )}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.resultFooter}>
        <View style={styles.availabilityInfo}>
          <FontAwesome5 name="chair" size={14} color="#10B981" />
          <Text style={styles.availabilityText}>
            {item.availability.available_seats} / {item.availability.total_seats} seats
          </Text>
        </View>
        <TouchableOpacity style={styles.bookButton}>
          <FontAwesome5 name="ticket-alt" size={14} color="#FFF" />
          <Text style={styles.bookButtonText}>Book Now</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderPopularDestination = (destination: string) => (
    <TouchableOpacity
      key={destination}
      style={styles.destinationChip}
      onPress={() => {
        if (!searchParams.from) {
          setSearchParams(prev => ({ ...prev, from: destination }));
        } else if (!searchParams.to && searchParams.from !== destination) {
          setSearchParams(prev => ({ ...prev, to: destination }));
        }
      }}
    >
      <FontAwesome5 name="map-marker-alt" size={12} color="#007AFF" />
      <Text style={styles.destinationChipText}>{destination}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search Trips</Text>
        <Text style={styles.headerSubtitle}>Find your perfect boat journey</Text>
      </View>

      {/* Search Mode Toggle */}
      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[styles.modeButton, searchMode === 'DESTINATION' && styles.activeModeButton]}
          onPress={() => {
            setSearchMode('DESTINATION');
            setSearchParams(prev => ({ ...prev, mode: 'DESTINATION' }));
          }}
        >
          <FontAwesome5 name="route" size={16} color={searchMode === 'DESTINATION' ? "#FFF" : "#6B7280"} />
          <Text style={[styles.modeButtonText, searchMode === 'DESTINATION' && styles.activeModeButtonText]}>
            Route Search
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.modeButton, searchMode === 'BOAT' && styles.activeModeButton]}
          onPress={() => {
            setSearchMode('BOAT');
            setSearchParams(prev => ({ ...prev, mode: 'BOAT' }));
          }}
        >
          <FontAwesome5 name="ship" size={16} color={searchMode === 'BOAT' ? "#FFF" : "#6B7280"} />
          <Text style={[styles.modeButtonText, searchMode === 'BOAT' && styles.activeModeButtonText]}>
            Boat Search
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Form */}
      <View style={styles.searchForm}>
        {searchMode === 'DESTINATION' ? (
          <>
            {/* From/To Inputs */}
            <View style={styles.routeInputs}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>From</Text>
                <View style={styles.inputContainer}>
                  <FontAwesome5 name="map-marker-alt" size={16} color="#10B981" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Pickup location"
                    value={searchParams.from}
                    onChangeText={(value) => setSearchParams(prev => ({ ...prev, from: value }))}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.swapButton}
                onPress={() => setSearchParams(prev => ({ 
                  ...prev, 
                  from: prev.to, 
                  to: prev.from 
                }))}
              >
                <FontAwesome5 name="exchange-alt" size={16} color="#007AFF" />
              </TouchableOpacity>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>To</Text>
                <View style={styles.inputContainer}>
                  <FontAwesome5 name="map-marker-alt" size={16} color="#EF4444" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Dropoff location"
                    value={searchParams.to}
                    onChangeText={(value) => setSearchParams(prev => ({ ...prev, to: value }))}
                  />
                </View>
              </View>
            </View>

            {/* Popular Destinations */}
            {popularDestinations.length > 0 && (
              <View style={styles.popularSection}>
                <Text style={styles.popularTitle}>Popular Destinations</Text>
                <View style={styles.popularGrid}>
                  {popularDestinations.slice(0, 6).map(renderPopularDestination)}
                </View>
              </View>
            )}
          </>
        ) : (
          <>
            {/* Boat Search Inputs */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Departure Location</Text>
              <View style={styles.inputContainer}>
                <FontAwesome5 name="map-marker-alt" size={16} color="#007AFF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter departure location"
                  value={searchParams.from}
                  onChangeText={(value) => setSearchParams(prev => ({ ...prev, from: value }))}
                />
              </View>
            </View>
          </>
        )}

        {/* Date and Passengers */}
        <View style={styles.datePassengerRow}>
          <View style={styles.dateGroup}>
            <Text style={styles.inputLabel}>Travel Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <FontAwesome5 name="calendar" size={16} color="#007AFF" />
              <Text style={styles.dateButtonText}>
                {new Date(searchParams.date || '').toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.passengerGroup}>
            <Text style={styles.inputLabel}>Passengers</Text>
            <View style={styles.passengerControls}>
              <TouchableOpacity
                style={styles.passengerButton}
                onPress={() => setSearchParams(prev => ({ 
                  ...prev, 
                  passengers: Math.max(1, (prev.passengers || 1) - 1) 
                }))}
              >
                <FontAwesome5 name="minus" size={14} color="#6B7280" />
              </TouchableOpacity>
              <Text style={styles.passengerCount}>{searchParams.passengers || 1}</Text>
              <TouchableOpacity
                style={styles.passengerButton}
                onPress={() => setSearchParams(prev => ({ 
                  ...prev, 
                  passengers: Math.min(10, (prev.passengers || 1) + 1) 
                }))}
              >
                <FontAwesome5 name="plus" size={14} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Search Button */}
        <TouchableOpacity
          style={[styles.searchButton, isSearching && styles.disabledButton]}
          onPress={handleSearch}
          disabled={isSearching}
        >
          {isSearching ? (
            <Text style={styles.searchButtonText}>Searching...</Text>
          ) : (
            <>
              <FontAwesome5 name="search" size={16} color="#FFF" />
              <Text style={styles.searchButtonText}>Search Trips</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <View style={styles.resultsSection}>
          <Text style={styles.resultsTitle}>
            {searchResults.length} trip{searchResults.length !== 1 ? 's' : ''} found
          </Text>
          <FlatList
            data={searchResults}
            renderItem={renderSearchResult}
            keyExtractor={(item) => item.schedule.id.toString()}
            contentContainerStyle={styles.resultsList}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={new Date(searchParams.date || '')}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              setSearchParams(prev => ({ 
                ...prev, 
                date: selectedDate.toISOString().split('T')[0] 
              }));
            }
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FA' },

  header: {
    backgroundColor: '#FFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },

  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    margin: 16,
    borderRadius: 8,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 6,
    gap: 8,
  },
  activeModeButton: {
    backgroundColor: '#007AFF',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeModeButtonText: {
    color: '#FFF',
  },

  searchForm: {
    backgroundColor: '#FFF',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  routeInputs: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginBottom: 16,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#111827',
  },

  swapButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },

  popularSection: {
    marginBottom: 16,
  },
  popularTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  popularGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  destinationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  destinationChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#007AFF',
  },

  datePassengerRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  dateGroup: {
    flex: 2,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    gap: 8,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#111827',
  },

  passengerGroup: {
    flex: 1,
  },
  passengerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFF',
  },
  passengerButton: {
    width: 40,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passengerCount: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },

  searchButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  searchButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },

  resultsSection: {
    flex: 1,
    margin: 16,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  resultsList: {
    gap: 12,
  },

  resultCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  resultInfo: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  resultDate: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 2,
  },
  resultBoat: {
    fontSize: 13,
    color: '#6B7280',
  },
  resultPrice: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  priceAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },

  resultRoute: {
    marginBottom: 12,
  },
  routeSegments: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeSegment: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  segmentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginBottom: 4,
  },
  segmentInfo: {
    alignItems: 'center',
  },
  segmentLocation: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  segmentTime: {
    fontSize: 11,
    color: '#6B7280',
  },
  segmentLine: {
    position: 'absolute',
    top: 4,
    left: '50%',
    right: '-50%',
    height: 2,
    backgroundColor: '#E5E7EB',
    zIndex: -1,
  },

  resultFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  availabilityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  availabilityText: {
    fontSize: 13,
    color: '#374151',
  },
  bookButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bookButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});