import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Card,
  Text,
  Button,
  Surface,
  Chip,
} from '../compat/paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';
import { SearchResult, User } from '../types';
import { theme, spacing, colors } from '../theme/theme';
import { format } from 'date-fns';

interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [featuredTrips, setFeaturedTrips] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadFeaturedTrips();
  }, []);

  const loadFeaturedTrips = async () => {
    setLoading(true);
    try {
      // Load today's trips as featured
      const today = new Date().toISOString().split('T')[0];
      const result = await apiService.searchTrips({
        date: today,
        passenger_count: 1,
      });

      if (result.success) {
        setFeaturedTrips(result.data?.slice(0, 5) || []);
      } else {
        console.error('Failed to load featured trips:', result.error);
      }
    } catch (error) {
      console.error('Error loading featured trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFeaturedTrips();
    setRefreshing(false);
  };

  const renderWelcomeSection = () => (
    <Surface style={styles.welcomeCard} elevation={1}>
      <View style={styles.welcomeContent}>
        <Text variant="headlineSmall" style={styles.welcomeTitle}>
          Welcome {user?.role === 'PUBLIC' ? '' : `${user?.role?.toLowerCase()}`}! 🌊
        </Text>
        <Text variant="bodyMedium" style={styles.welcomeSubtitle}>
          Find and book ferry tickets across the Maldives
        </Text>
        
        <View style={styles.quickActions}>
          <Button
            mode="contained"
            icon="magnify"
            onPress={() => navigation.navigate('Search')}
            style={styles.quickActionButton}
            contentStyle={styles.quickActionContent}
          >
            Search Trips
          </Button>
        </View>
      </View>
    </Surface>
  );

  const renderRoleSpecificActions = () => {
    switch (user?.role) {
      case 'AGENT':
        return (
          <Surface style={styles.roleCard} elevation={1}>
            <Text variant="titleMedium" style={styles.roleTitle}>
              Agent Quick Actions
            </Text>
            <View style={styles.roleActions}>
              <Button
                mode="outlined"
                icon="account-group"
                onPress={() => navigation.navigate('Agent')}
                style={styles.roleActionButton}
              >
                Agent Portal
              </Button>
              <Button
                mode="outlined"
                icon="credit-card"
                onPress={() => {/* Navigate to credit status */}}
                style={styles.roleActionButton}
              >
                Credit Status
              </Button>
            </View>
          </Surface>
        );

      case 'OWNER':
        return (
          <Surface style={styles.roleCard} elevation={1}>
            <Text variant="titleMedium" style={styles.roleTitle}>
              Owner Quick Actions
            </Text>
            <View style={styles.roleActions}>
              <Button
                mode="outlined"
                icon="ferry"
                onPress={() => navigation.navigate('Owner')}
                style={styles.roleActionButton}
              >
                Owner Portal
              </Button>
              <Button
                mode="outlined"
                icon="chart-line"
                onPress={() => {/* Navigate to analytics */}}
                style={styles.roleActionButton}
              >
                Analytics
              </Button>
            </View>
          </Surface>
        );

      case 'PUBLIC':
        return (
          <Surface style={styles.roleCard} elevation={1}>
            <Text variant="titleMedium" style={styles.roleTitle}>
              My Recent Activity
            </Text>
            <View style={styles.roleActions}>
              <Button
                mode="outlined"
                icon="ticket"
                onPress={() => navigation.navigate('Tickets')}
                style={styles.roleActionButton}
              >
                My Tickets
              </Button>
              <Button
                mode="outlined"
                icon="book"
                onPress={() => navigation.navigate('Bookings')}
                style={styles.roleActionButton}
              >
                My Bookings
              </Button>
            </View>
          </Surface>
        );

      default:
        return null;
    }
  };

  const renderFeaturedTrips = () => (
    <View style={styles.featuredSection}>
      <View style={styles.sectionHeader}>
        <Text variant="titleLarge" style={styles.sectionTitle}>
          Today&apos;s Trips
        </Text>
        {/* IconButton for refresh is removed, so this line is removed */}
      </View>

      {loading ? (
        <Card style={styles.loadingCard}>
          <Card.Content>
            <Text>Loading trips...</Text>
          </Card.Content>
        </Card>
      ) : featuredTrips.length > 0 ? (
        featuredTrips.map((trip, index) => (
          <TripCard
            key={`${trip.schedule.id}-${index}`}
            trip={trip}
            onPress={() => {
              navigation.navigate('BookingFlow', {
                scheduleId: trip.schedule.id,
                segmentKey: 'default',
              });
            }}
          />
        ))
      ) : (
        <Card style={styles.emptyCard}>
          <Card.Content style={styles.emptyContent}>
            <MaterialCommunityIcons
              name="ferry"
              size={48}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="bodyLarge" style={styles.emptyText}>
              No trips available today
            </Text>
            <Text variant="bodySmall" style={styles.emptySubtext}>
              Try searching for trips on other dates
            </Text>
          </Card.Content>
        </Card>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderWelcomeSection()}
        {renderRoleSpecificActions()}
        {renderFeaturedTrips()}
        
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* FAB is removed, so this block is removed */}
    </View>
  );
};

interface TripCardProps {
  trip: SearchResult;
  onPress: () => void;
}

const TripCard: React.FC<TripCardProps> = ({ trip, onPress }) => {
  const { schedule, pricing } = trip;
  
  return (
    <Card style={styles.tripCard} onPress={onPress}>
      <Card.Content>
        <View style={styles.tripHeader}>
          <View style={styles.tripInfo}>
            <Text variant="titleMedium" style={styles.tripRoute}>
              {schedule.boat.name}
            </Text>
            <Text variant="bodySmall" style={styles.tripOwner}>
              by {schedule.owner.brand_name}
            </Text>
          </View>
          <View style={styles.tripPrice}>
            <Text variant="titleMedium" style={styles.priceText}>
              {pricing.currency} {pricing.total.toFixed(2)}
            </Text>
            <Text variant="bodySmall" style={styles.priceLabel}>
              per person
            </Text>
          </View>
        </View>

        <View style={styles.tripDetails}>
          <View style={styles.tripTime}>
            <MaterialCommunityIcons 
              name="clock-outline" 
              size={16} 
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="bodySmall" style={styles.timeText}>
              {format(new Date(schedule.start_at), 'HH:mm')}
            </Text>
          </View>
          
          <View style={styles.tripCapacity}>
            <MaterialCommunityIcons 
              name="seat" 
              size={16} 
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="bodySmall" style={styles.capacityText}>
              {schedule.available_seats} seats available
            </Text>
          </View>
        </View>

        <View style={styles.tripChips}>
          <Chip mode="outlined" compact style={styles.tripChip}>
            {schedule.seat_mode}
          </Chip>
          {schedule.available_seats < 10 && (
            <Chip 
              mode="outlined" 
              compact 
              style={[styles.tripChip, styles.lowAvailabilityChip]}
              textStyle={styles.lowAvailabilityText}
            >
              Low Availability
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
  },
  scrollView: {
    flex: 1,
  },
  welcomeCard: {
    margin: spacing.md,
    borderRadius: 16,
    backgroundColor: theme.colors.primaryContainer,
  },
  welcomeContent: {
    padding: spacing.lg,
  },
  welcomeTitle: {
    fontWeight: 'bold',
    color: theme.colors.onPrimaryContainer,
    marginBottom: spacing.sm,
  },
  welcomeSubtitle: {
    color: theme.colors.onPrimaryContainer,
    opacity: 0.8,
    marginBottom: spacing.lg,
  },
  quickActions: {
    flexDirection: 'row',
  },
  quickActionButton: {
    flex: 1,
  },
  quickActionContent: {
    height: 48,
  },
  roleCard: {
    margin: spacing.md,
    marginTop: 0,
    borderRadius: 12,
  },
  roleTitle: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
    fontWeight: '600',
  },
  roleActions: {
    flexDirection: 'row',
    padding: spacing.md,
    paddingTop: 0,
    gap: spacing.sm,
  },
  roleActionButton: {
    flex: 1,
  },
  featuredSection: {
    margin: spacing.md,
    marginTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontWeight: 'bold',
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
  tripRoute: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  tripOwner: {
    opacity: 0.7,
  },
  tripPrice: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  priceLabel: {
    opacity: 0.7,
  },
  tripDetails: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  tripTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  timeText: {
    opacity: 0.7,
  },
  tripCapacity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  capacityText: {
    opacity: 0.7,
  },
  tripChips: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  tripChip: {
    height: 28,
  },
  lowAvailabilityChip: {
    borderColor: colors.warning,
  },
  lowAvailabilityText: {
    color: colors.warning,
  },
  loadingCard: {
    borderRadius: 12,
  },
  emptyCard: {
    borderRadius: 12,
  },
  emptyContent: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    marginTop: spacing.md,
    fontWeight: '600',
  },
  emptySubtext: {
    marginTop: spacing.xs,
    opacity: 0.7,
    textAlign: 'center',
  },
  // fab: { // This line is removed
  //   position: 'absolute',
  //   margin: 16,
  //   right: 0,
  //   bottom: 0,
  //   backgroundColor: theme.colors.primary,
  // },
  bottomSpacing: {
    height: 100,
  },
});
