import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { format, isAfter, isBefore } from 'date-fns';
import React, { useCallback, useState } from 'react';
import {
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import {
    ActivityIndicator,
    Button,
    Chip,
    FAB,
    Searchbar,
    Surface,
    Text,
} from 'react-native-paper';
import { TicketCard } from '../components/TicketCard';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';
import { colors, spacing, theme } from '../theme/theme';
import { Ticket } from '../types';

interface MyTicketsScreenProps {
  navigation: any;
}

export const MyTicketsScreen: React.FC<MyTicketsScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'UPCOMING' | 'PAST' | 'USED'>('ALL');

  useFocusEffect(
    useCallback(() => {
      loadTickets();
    }, [])
  );

  const loadTickets = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const result = await apiService.getUserTickets(user.id);

      if (result.success) {
        setTickets(result.data || []);
      } else {
        console.error('Failed to load tickets:', result.error);
        Alert.alert('Error', 'Failed to load your tickets');
      }
    } catch (error: any) {
      console.error('Error loading tickets:', error);
      Alert.alert('Error', 'Failed to load your tickets');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTickets();
    setRefreshing(false);
  };

  const getFilteredTickets = () => {
    let filtered = tickets;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ticket => 
        ticket.passenger_name.toLowerCase().includes(query) ||
        ticket.booking.id.toLowerCase().includes(query) ||
        ticket.booking.schedule.boat.name.toLowerCase().includes(query) ||
        ticket.booking.schedule.owner.brand_name.toLowerCase().includes(query)
      );
    }

    // Filter by status
    switch (filterStatus) {
      case 'UPCOMING':
        filtered = filtered.filter(ticket => {
          const departureTime = new Date(ticket.booking.schedule.start_at);
          return isAfter(departureTime, new Date()) && ticket.status === 'ISSUED';
        });
        break;
      case 'PAST':
        filtered = filtered.filter(ticket => {
          const departureTime = new Date(ticket.booking.schedule.start_at);
          return isBefore(departureTime, new Date());
        });
        break;
      case 'USED':
        filtered = filtered.filter(ticket => ticket.status === 'USED');
        break;
      default:
        // ALL - no additional filtering
        break;
    }

    // Sort by departure time (upcoming first, then past in reverse order)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.booking.schedule.start_at);
      const dateB = new Date(b.booking.schedule.start_at);
      const now = new Date();

      const aIsUpcoming = isAfter(dateA, now);
      const bIsUpcoming = isAfter(dateB, now);

      if (aIsUpcoming && bIsUpcoming) {
        // Both upcoming, sort by earliest first
        return dateA.getTime() - dateB.getTime();
      } else if (aIsUpcoming && !bIsUpcoming) {
        // A is upcoming, B is past - A comes first
        return -1;
      } else if (!aIsUpcoming && bIsUpcoming) {
        // A is past, B is upcoming - B comes first
        return 1;
      } else {
        // Both past, sort by latest first
        return dateB.getTime() - dateA.getTime();
      }
    });
  };

  const getTicketStats = () => {
    const now = new Date();
    const upcoming = tickets.filter(t => 
      isAfter(new Date(t.booking.schedule.start_at), now) && t.status === 'ISSUED'
    ).length;
    const used = tickets.filter(t => t.status === 'USED').length;
    const total = tickets.length;

    return { upcoming, used, total };
  };

  const renderStats = () => {
    const stats = getTicketStats();

    return (
      <Surface style={styles.statsContainer} elevation={1}>
        <View style={styles.statItem}>
          <Text variant="titleLarge" style={[styles.statNumber, { color: colors.success }]}>
            {stats.upcoming}
          </Text>
          <Text variant="bodySmall" style={styles.statLabel}>
            Upcoming
          </Text>
        </View>
        
        <View style={styles.statDivider} />
        
        <View style={styles.statItem}>
          <Text variant="titleLarge" style={[styles.statNumber, { color: colors.info }]}>
            {stats.used}
          </Text>
          <Text variant="bodySmall" style={styles.statLabel}>
            Used
          </Text>
        </View>
        
        <View style={styles.statDivider} />
        
        <View style={styles.statItem}>
          <Text variant="titleLarge" style={styles.statNumber}>
            {stats.total}
          </Text>
          <Text variant="bodySmall" style={styles.statLabel}>
            Total
          </Text>
        </View>
      </Surface>
    );
  };

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterChips}
      >
        {[
          { key: 'ALL', label: 'All Tickets' },
          { key: 'UPCOMING', label: 'Upcoming' },
          { key: 'PAST', label: 'Past Trips' },
          { key: 'USED', label: 'Used' },
        ].map((filter) => (
          <Chip
            key={filter.key}
            mode={filterStatus === filter.key ? 'flat' : 'outlined'}
            selected={filterStatus === filter.key}
            onPress={() => setFilterStatus(filter.key as any)}
            style={styles.filterChip}
          >
            {filter.label}
          </Chip>
        ))}
      </ScrollView>
    </View>
  );

  const renderEmptyState = () => {
    const isFiltered = searchQuery.trim() || filterStatus !== 'ALL';
    
    return (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons
          name={isFiltered ? "filter-off" : "ticket-outline"}
          size={64}
          color={theme.colors.onSurfaceVariant}
        />
        <Text variant="headlineSmall" style={styles.emptyTitle}>
          {isFiltered ? 'No tickets found' : 'No tickets yet'}
        </Text>
        <Text variant="bodyMedium" style={styles.emptySubtitle}>
          {isFiltered 
            ? 'Try adjusting your search or filters' 
            : 'Book your first ferry trip to see tickets here'
          }
        </Text>
        
        {!isFiltered && (
          <Button
            mode="contained"
            onPress={() => navigation.navigate('Search')}
            style={styles.emptyAction}
            icon="magnify"
          >
            Search Trips
          </Button>
        )}
      </View>
    );
  };

  const renderTicketsList = () => {
    const filteredTickets = getFilteredTickets();

    if (filteredTickets.length === 0) {
      return renderEmptyState();
    }

    return (
      <View style={styles.ticketsList}>
        {filteredTickets.map((ticket) => (
          <TicketCard
            key={ticket.id}
            ticket={ticket}
            onPress={() => {
              // Could navigate to detailed ticket view
              console.log('Ticket pressed:', ticket.id);
            }}
          />
        ))}
      </View>
    );
  };

  const renderUpcomingReminder = () => {
    const upcomingToday = tickets.filter(ticket => {
      const departureDate = new Date(ticket.booking.schedule.start_at);
      const today = new Date();
      return (
        format(departureDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd') &&
        ticket.status === 'ISSUED'
      );
    });

    if (upcomingToday.length === 0) return null;

    return (
      <Surface style={styles.reminderCard} elevation={1}>
        <View style={styles.reminderContent}>
          <MaterialCommunityIcons
            name="clock-alert"
            size={24}
            color={colors.warning}
          />
          <View style={styles.reminderText}>
            <Text variant="titleSmall" style={styles.reminderTitle}>
              Trips Today
            </Text>
            <Text variant="bodySmall" style={styles.reminderSubtitle}>
              You have {upcomingToday.length} trip{upcomingToday.length !== 1 ? 's' : ''} scheduled for today
            </Text>
          </View>
        </View>
      </Surface>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text variant="bodyLarge" style={styles.loadingText}>
          Loading your tickets...
        </Text>
      </View>
    );
  }

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
          placeholder="Search tickets, boats, or bookings..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          icon="ticket-outline"
        />

        {/* Stats */}
        {tickets.length > 0 && renderStats()}

        {/* Upcoming Reminder */}
        {renderUpcomingReminder()}

        {/* Filters */}
        {tickets.length > 0 && renderFilters()}

        {/* Tickets List */}
        {renderTicketsList()}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Floating Action Button */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('Search')}
        label="Book Trip"
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    textAlign: 'center',
  },
  searchBar: {
    margin: spacing.md,
    elevation: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    margin: spacing.md,
    marginTop: 0,
    padding: spacing.md,
    borderRadius: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontWeight: 'bold',
  },
  statLabel: {
    opacity: 0.7,
    marginTop: spacing.xs,
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.outline,
    marginHorizontal: spacing.md,
  },
  reminderCard: {
    margin: spacing.md,
    marginTop: 0,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.warning + '10',
    borderWidth: 1,
    borderColor: colors.warning + '30',
  },
  reminderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reminderText: {
    flex: 1,
  },
  reminderTitle: {
    fontWeight: '600',
    color: colors.warning,
  },
  reminderSubtitle: {
    color: colors.warning,
    opacity: 0.8,
  },
  filtersContainer: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  filterChips: {
    paddingHorizontal: spacing.xs,
    gap: spacing.sm,
  },
  filterChip: {
    marginRight: spacing.xs,
  },
  ticketsList: {
    paddingHorizontal: spacing.md,
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
