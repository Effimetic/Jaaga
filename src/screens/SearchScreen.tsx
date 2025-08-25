import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import {
    Button,
    Card,
    Chip,
    Surface,
    Text,
    TextInput,
} from '../compat/paper';
import { DatePickerInput } from 'react-native-paper-dates';
import { apiService } from '../services/apiService';
import { spacing, theme } from '../theme/theme';
import { SearchFilters, SearchResult } from '../types';

interface SearchScreenProps {
  navigation: any;
}

export const SearchScreen: React.FC<SearchScreenProps> = ({ navigation }) => {
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    from: '',
    to: '',
    date: new Date().toISOString().split('T')[0],
    passenger_count: 1,
  });
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!searchFilters.date) {
      Alert.alert('Error', 'Please select a travel date');
      return;
    }

    if (searchFilters.passenger_count! < 1 || searchFilters.passenger_count! > 10) {
      Alert.alert('Error', 'Passenger count must be between 1 and 10');
      return;
    }

    setLoading(true);
    setHasSearched(true);
    
    try {
      const result = await apiService.searchTrips(searchFilters);
      
      if (result.success) {
        setSearchResults(result.data || []);
      } else {
        Alert.alert('Error', result.error || 'Failed to search trips');
        setSearchResults([]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to search trips');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const renderSearchForm = () => (
    <Surface style={styles.searchCard} elevation={1}>
      <Text variant="titleMedium" style={styles.searchTitle}>
        Search Ferry Trips
      </Text>

      <View style={styles.routeInputs}>
        <TextInput
          label="From"
          value={searchFilters.from}
          onChangeText={(text) => setSearchFilters({ ...searchFilters, from: text })}
          mode="outlined"
          style={styles.routeInput}
          left={<TextInput.Icon icon="map-marker" />}
          placeholder="Departure location"
        />

        <View style={styles.swapButtonContainer}>
          <Button
            mode="text"
            icon="swap-horizontal"
            onPress={() => {
              setSearchFilters({
                ...searchFilters,
                from: searchFilters.to,
                to: searchFilters.from,
              });
            }}
            contentStyle={styles.swapButtonContent}
          >
            Swap
          </Button>
        </View>

        <TextInput
          label="To"
          value={searchFilters.to}
          onChangeText={(text) => setSearchFilters({ ...searchFilters, to: text })}
          mode="outlined"
          style={styles.routeInput}
          left={<TextInput.Icon icon="map-marker-check" />}
          placeholder="Destination"
        />
      </View>

      <View style={styles.datePassengerRow}>
        <DatePickerInput
          locale="en"
          label="Travel Date"
          value={searchFilters.date ? new Date(searchFilters.date) : undefined}
          onChange={(date) => {
            setSearchFilters({
              ...searchFilters,
              date: date?.toISOString().split('T')[0] || '',
            });
          }}
          inputMode="start"
          mode="outlined"
          style={styles.dateInput}
        />

        <TextInput
          label="Passengers"
          value={searchFilters.passenger_count?.toString() || '1'}
          onChangeText={(text) => {
            const count = parseInt(text) || 1;
            setSearchFilters({ ...searchFilters, passenger_count: count });
          }}
          mode="outlined"
          keyboardType="numeric"
          style={styles.passengerInput}
          left={<TextInput.Icon icon="account-group" />}
        />
      </View>

      <Button
        mode="contained"
        onPress={handleSearch}
        disabled={loading}
        style={styles.searchButton}
        contentStyle={styles.searchButtonContent}
      >
        Search Trips
      </Button>
    </Surface>
  );

  const renderSearchResults = () => {
    if (!hasSearched) return null;

    if (loading) {
      return (
        <Surface style={styles.resultsCard} elevation={1}>
          <View style={styles.loadingContainer}>
            {/* Simple loading replacement */}
            <Text>Loading...</Text>
          </View>
        </Surface>
      );
    }

    if (searchResults.length === 0) {
      return (
        <Surface style={styles.resultsCard} elevation={1}>
          <View style={styles.emptyResults}>
            <MaterialCommunityIcons
              name="ferry-off"
              size={64}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="headlineSmall" style={styles.emptyTitle}>
              No trips found
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtitle}>
              Try adjusting your search criteria
            </Text>
          </View>
        </Surface>
      );
    }

    return (
      <View style={styles.resultsSection}>
        <Text variant="titleLarge" style={styles.resultsTitle}>
          {searchResults.length} trip{searchResults.length !== 1 ? 's' : ''} found
        </Text>
        
        {searchResults.map((result, index) => (
          <TripResultCard
            key={`${result.schedule.id}-${index}`}
            result={result}
            onPress={() => {
              navigation.navigate('BookingFlow', {
                scheduleId: result.schedule.id,
                segmentKey: 'default',
              });
            }}
          />
        ))}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {renderSearchForm()}
      {renderSearchResults()}
      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

interface TripResultCardProps {
  result: SearchResult;
  onPress: () => void;
}

const TripResultCard: React.FC<TripResultCardProps> = ({ result, onPress }) => {
  const { schedule, pricing } = result;
  
  return (
    <Card style={styles.tripCard} onPress={onPress}>
      <Card.Content>
        <View style={styles.tripHeader}>
          <View style={styles.tripInfo}>
            <Text variant="titleMedium" style={styles.boatName}>
              {schedule.boat.name}
            </Text>
            <Text variant="bodySmall" style={styles.ownerName}>
              {schedule.owner.brand_name}
            </Text>
          </View>
          <View style={styles.priceInfo}>
            <Text variant="titleLarge" style={styles.price}>
              {pricing.currency} {pricing.total.toFixed(2)}
            </Text>
            <Text variant="bodySmall" style={styles.pricePerPerson}>
              per person
            </Text>
          </View>
        </View>

        <View style={styles.tripDetails}>
          <View style={styles.timeInfo}>
            <MaterialCommunityIcons 
              name="clock-outline" 
              size={16} 
              color={theme.colors.primary}
            />
            <Text variant="bodyMedium">
              {new Date(schedule.start_at).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
          
          <View style={styles.capacityInfo}>
            <MaterialCommunityIcons 
              name="seat" 
              size={16} 
              color={theme.colors.primary}
            />
            <Text variant="bodyMedium">
              {schedule.available_seats} available
            </Text>
          </View>
        </View>

        <View style={styles.chipContainer}>
          <Chip mode="outlined" compact>
            {schedule.seat_mode}
          </Chip>
          {schedule.available_seats < 10 && (
            <Chip mode="outlined" compact textStyle={styles.urgentChip}>
              Few seats left
            </Chip>
          )}
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: spacing.md,
  },
  searchCard: {
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  searchTitle: {
    fontWeight: 'bold',
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  routeInputs: {
    marginBottom: spacing.md,
  },
  routeInput: {
    marginBottom: spacing.sm,
  },
  swapButtonContainer: {
    alignItems: 'center',
    marginVertical: spacing.xs,
  },
  swapButtonContent: {
    height: 36,
  },
  datePassengerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  dateInput: {
    flex: 2,
  },
  passengerInput: {
    flex: 1,
  },
  searchButton: {
    marginTop: spacing.sm,
  },
  searchButtonContent: {
    height: 48,
  },
  resultsCard: {
    borderRadius: 12,
    padding: spacing.xl,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
  },
  emptyResults: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    marginTop: spacing.md,
    fontWeight: 'bold',
  },
  emptySubtitle: {
    marginTop: spacing.sm,
    opacity: 0.7,
    textAlign: 'center',
  },
  resultsSection: {
    marginTop: spacing.md,
  },
  resultsTitle: {
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
  tripCard: {
    marginBottom: spacing.sm,
    borderRadius: 12,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  tripInfo: {
    flex: 1,
  },
  boatName: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  ownerName: {
    opacity: 0.7,
  },
  priceInfo: {
    alignItems: 'flex-end',
  },
  price: {
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  pricePerPerson: {
    opacity: 0.7,
  },
  tripDetails: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  capacityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  chipContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  urgentChip: {
    color: theme.colors.error,
  },
  bottomSpacing: {
    height: 80,
  },
});