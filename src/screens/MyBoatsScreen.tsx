import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
    Alert,
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import {
    Button,
    Card,
    Chip,
    FAB,
    Searchbar,
    Surface,
    Text,
} from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { boatManagementService, BoatWithPhotos } from '../services/boatManagementService';
import { colors, spacing, theme } from '../theme/theme';

interface BoatFilters {
  status: 'ALL' | 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
  seatMode: 'ALL' | 'SEATMAP' | 'CAPACITY';
}

export const MyBoatsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [boats, setBoats] = useState<BoatWithPhotos[]>([]);
  const [, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<BoatFilters>({
    status: 'ALL',
    seatMode: 'ALL',
  });

  useFocusEffect(
    useCallback(() => {
      loadBoats();
    }, [loadBoats])
  );

  const loadBoats = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const result = await boatManagementService.getOwnerBoats(user.id);
      
      if (result.success) {
        setBoats(result.data || []);
      } else {
        Alert.alert('Error', result.error || 'Failed to load boats');
      }
    } catch (error) {
      console.error('Failed to load boats:', error);
      Alert.alert('Error', 'Failed to load boats');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBoats();
    setRefreshing(false);
  };

  const handleDeleteBoat = async (boat: BoatWithPhotos) => {
    Alert.alert(
      'Delete Boat',
      `Are you sure you want to delete "${boat.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await boatManagementService.deleteBoat(boat.id);
            if (result.success) {
              loadBoats();
            } else {
              Alert.alert('Error', result.error || 'Failed to delete boat');
            }
          },
        },
      ]
    );
  };

  const getFilteredBoats = () => {
    let filtered = boats;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(boat =>
        boat.name.toLowerCase().includes(query) ||
        boat.registration?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (filters.status !== 'ALL') {
      filtered = filtered.filter(boat => boat.status === filters.status);
    }

    // Apply seat mode filter
    if (filters.seatMode !== 'ALL') {
      filtered = filtered.filter(boat => boat.seat_mode === filters.seatMode);
    }

    return filtered;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return colors.success;
      case 'MAINTENANCE':
        return colors.warning;
      case 'INACTIVE':
        return colors.error;
      default:
        return theme.colors.onSurfaceVariant;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'check-circle';
      case 'MAINTENANCE':
        return 'wrench';
      case 'INACTIVE':
        return 'pause-circle';
      default:
        return 'help-circle';
    }
  };

  const renderBoatCard = (boat: BoatWithPhotos) => (
    <Card key={boat.id} style={styles.boatCard} onPress={() => navigation.navigate('ViewBoat', { boatId: boat.id })}>
      <View style={styles.cardContent}>
        {/* Boat Image */}
        <View style={styles.imageContainer}>
          {boat.primary_photo || (boat.photos && boat.photos.length > 0) ? (
            <Image
              source={{ uri: boat.primary_photo || boat.photos[0] }}
              style={styles.boatImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholderImage}>
              <MaterialCommunityIcons
                name="ferry"
                size={32}
                color={theme.colors.onSurfaceVariant}
              />
            </View>
          )}

          <View style={styles.statusBadge}>
            <Chip
              mode="flat"
              style={[
                styles.statusChip,
                { backgroundColor: getStatusColor(boat.status) + '20' }
              ]}
              textStyle={{ color: getStatusColor(boat.status), fontSize: 10 }}
              icon={() => (
                <MaterialCommunityIcons
                  name={getStatusIcon(boat.status)}
                  size={12}
                  color={getStatusColor(boat.status)}
                />
              )}
            >
              {boat.status}
            </Chip>
          </View>
        </View>

        {/* Boat Details */}
        <Card.Content style={styles.boatDetails}>
          <Text variant="titleMedium" style={styles.boatName}>
            {boat.name}
          </Text>

          {boat.registration && (
            <Text variant="bodySmall" style={styles.registration}>
              Registration: {boat.registration}
            </Text>
          )}

          <View style={styles.boatInfo}>
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="seat" size={16} color={theme.colors.primary} />
              <Text variant="bodySmall" style={styles.infoText}>
                {boat.capacity} seats
              </Text>
            </View>

            <View style={styles.infoItem}>
              <MaterialCommunityIcons
                name={boat.seat_mode === 'SEATMAP' ? 'view-grid' : 'counter'}
                size={16}
                color={theme.colors.primary}
              />
              <Text variant="bodySmall" style={styles.infoText}>
                {boat.seat_mode === 'SEATMAP' ? 'Seat Map' : 'Capacity Mode'}
              </Text>
            </View>
          </View>

          {boat.amenities && boat.amenities.length > 0 && (
            <View style={styles.amenities}>
              {boat.amenities.slice(0, 3).map((amenity, index) => (
                <Chip key={index} mode="outlined" compact style={styles.amenityChip}>
                  {amenity}
                </Chip>
              ))}
              {boat.amenities.length > 3 && (
                <Text variant="bodySmall" style={styles.moreAmenities}>
                  +{boat.amenities.length - 3} more
                </Text>
              )}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.cardActions}>
            <Button
              mode="text"
              onPress={() => navigation.navigate('EditBoat', { boatId: boat.id })}
              compact
            >
              Edit
            </Button>
            <Button
              mode="text"
              onPress={() => navigation.navigate('BoatSchedules', { boatId: boat.id })}
              compact
            >
              Schedules
            </Button>
            <Button
              mode="text"
              onPress={() => handleDeleteBoat(boat)}
              compact
              textColor={colors.error}
            >
              Delete
            </Button>
          </View>
        </Card.Content>
      </View>
    </Card>
  );

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterChips}
      >
        {/* Status Filters */}
        {[
          { key: 'ALL', label: 'All Boats' },
          { key: 'ACTIVE', label: 'Active' },
          { key: 'MAINTENANCE', label: 'Maintenance' },
          { key: 'INACTIVE', label: 'Inactive' },
        ].map((filter) => (
          <Chip
            key={filter.key}
            mode={filters.status === filter.key ? 'flat' : 'outlined'}
            selected={filters.status === filter.key}
            onPress={() => setFilters({ ...filters, status: filter.key as any })}
            style={styles.filterChip}
          >
            {filter.label}
          </Chip>
        ))}

        {/* Seat Mode Filters */}
        {[
          { key: 'ALL', label: 'All Types' },
          { key: 'SEATMAP', label: 'Seat Map' },
          { key: 'CAPACITY', label: 'Capacity' },
        ].map((filter) => (
          <Chip
            key={filter.key}
            mode={filters.seatMode === filter.key ? 'flat' : 'outlined'}
            selected={filters.seatMode === filter.key}
            onPress={() => setFilters({ ...filters, seatMode: filter.key as any })}
            style={styles.filterChip}
          >
            {filter.label}
          </Chip>
        ))}
      </ScrollView>
    </View>
  );

  const renderEmptyState = () => {
    const isFiltered = searchQuery.trim() || filters.status !== 'ALL' || filters.seatMode !== 'ALL';
    
    return (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons
          name={isFiltered ? "filter-off-outline" : "ferry"}
          size={64}
          color={theme.colors.onSurfaceVariant}
        />
        <Text variant="headlineSmall" style={styles.emptyTitle}>
          {isFiltered ? 'No boats found' : 'No boats yet'}
        </Text>
        <Text variant="bodyMedium" style={styles.emptySubtitle}>
          {isFiltered
            ? 'Try adjusting your search or filters'
            : 'Add your first boat to start creating schedules'
          }
        </Text>

        {!isFiltered && (
          <Button
            mode="contained"
            onPress={() => navigation.navigate('AddBoat')}
            style={styles.emptyAction}
            icon="plus"
          >
            Add Your First Boat
          </Button>
        )}
      </View>
    );
  };

  const renderBoatsList = () => {
    const filteredBoats = getFilteredBoats();

    if (filteredBoats.length === 0) {
      return renderEmptyState();
    }

    return (
      <View style={styles.boatsList}>
        {filteredBoats.map(renderBoatCard)}
      </View>
    );
  };

  const renderSummaryStats = () => {
    const filteredBoats = getFilteredBoats();
    const totalCapacity = filteredBoats.reduce((sum, boat) => sum + (boat.capacity || 0), 0);
    const activeBoats = filteredBoats.filter(boat => boat.status === 'ACTIVE').length;

    if (boats.length === 0) return null;

    return (
      <Surface style={styles.summaryContainer} elevation={1}>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}>
            <Text variant="titleLarge" style={styles.summaryNumber}>
              {filteredBoats.length}
            </Text>
            <Text variant="bodySmall" style={styles.summaryLabel}>
              Total Boats
            </Text>
          </View>

          <View style={styles.summaryStat}>
            <Text variant="titleLarge" style={styles.summaryNumber}>
              {activeBoats}
            </Text>
            <Text variant="bodySmall" style={styles.summaryLabel}>
              Active
            </Text>
          </View>

          <View style={styles.summaryStat}>
            <Text variant="titleLarge" style={styles.summaryNumber}>
              {totalCapacity}
            </Text>
            <Text variant="bodySmall" style={styles.summaryLabel}>
              Total Seats
            </Text>
          </View>
        </View>
      </Surface>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <Searchbar
          placeholder="Search boats by name or registration..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          icon="ferry"
        />

        {/* Summary Stats */}
        {renderSummaryStats()}

        {/* Filters */}
        {boats.length > 0 && renderFilters()}

        {/* Boats List */}
        {renderBoatsList()}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Floating Action Button */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('AddBoat')}
        label="Add Boat"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  searchBar: {
    margin: spacing.md,
    elevation: 2,
  },
  summaryContainer: {
    margin: spacing.md,
    marginTop: 0,
    borderRadius: 12,
    padding: spacing.md,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryStat: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  summaryLabel: {
    opacity: 0.7,
    marginTop: spacing.xs,
  },
  filtersContainer: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  filterChips: {
    paddingHorizontal: spacing.xs,
    gap: spacing.sm,
  },
  filterChip: {
    marginRight: spacing.xs,
  },
  boatsList: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  boatCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
  },
  imageContainer: {
    position: 'relative',
    width: 120,
    height: 120,
  },
  boatImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
  },
  statusChip: {
    height: 24,
  },
  boatDetails: {
    flex: 1,
    padding: spacing.md,
  },
  boatName: {
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  registration: {
    opacity: 0.7,
    marginBottom: spacing.sm,
  },
  boatInfo: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  infoText: {
    opacity: 0.8,
  },
  amenities: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  amenityChip: {
    height: 24,
  },
  moreAmenities: {
    opacity: 0.7,
    alignSelf: 'center',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    marginTop: spacing.xl,
  },
  emptyTitle: {
    fontWeight: 'bold',
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptySubtitle: {
    opacity: 0.7,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  emptyAction: {
    marginTop: spacing.lg,
  },
  bottomSpacing: {
    height: 100,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
  },
});
