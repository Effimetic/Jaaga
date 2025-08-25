
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
    Alert,
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
    Surface,
    Text,
} from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { boatManagementService } from '../services/boatManagementService';
import { scheduleManagementService } from '../services/scheduleManagementService';
import { colors, spacing, theme } from '../theme/theme';

interface DashboardStats {
  boats: {
    total: number;
    active: number;
    capacity: number;
    with_schedules: number;
  };
  schedules: {
    total: number;
    active: number;
    draft: number;
    upcoming: number;
  };
  revenue: {
    this_month: number;
    total_bookings: number;
  };
}

interface QuickAction {
  title: string;
  icon: string;
  color: string;
  onPress: () => void;
}

export const OwnerDashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    boats: { total: 0, active: 0, capacity: 0, with_schedules: 0 },
    schedules: { total: 0, active: 0, draft: 0, upcoming: 0 },
    revenue: { this_month: 0, total_bookings: 0 },
  });
  const [, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  const loadDashboardData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Load boat statistics
      const boatStats = await boatManagementService.getBoatStatistics(user.id);
      
      // Load schedule statistics
      const scheduleStats = await scheduleManagementService.getScheduleStatistics(user.id);

      setStats({
        boats: {
          total: boatStats.total_boats,
          active: boatStats.active_boats,
          capacity: boatStats.total_capacity,
          with_schedules: boatStats.boats_with_schedules,
        },
        schedules: {
          total: scheduleStats.total_schedules,
          active: scheduleStats.active_schedules,
          draft: scheduleStats.draft_schedules,
          upcoming: scheduleStats.upcoming_departures,
        },
        revenue: {
          this_month: scheduleStats.revenue_this_month,
          total_bookings: scheduleStats.total_bookings,
        },
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const quickActions: QuickAction[] = [
    {
      title: 'My Boats',
      icon: 'ferry',
      color: colors.primary,
      onPress: () => navigation.navigate('MyBoats'),
    },
    {
      title: 'Add Boat',
      icon: 'plus-circle',
      color: colors.success,
      onPress: () => navigation.navigate('AddBoat'),
    },
    {
      title: 'View Bookings',
      icon: 'ticket',
      color: colors.info,
      onPress: () => navigation.navigate('Bookings'),
    },
    {
      title: 'Settings',
      icon: 'cog',
      color: colors.warning,
      onPress: () => navigation.navigate('OwnerSettings'),
    },
  ];

  const renderWelcomeCard = () => (
    <Card style={styles.welcomeCard}>
      <Card.Content>
        <View style={styles.welcomeHeader}>
          <View>
            <Text variant="headlineSmall" style={styles.welcomeTitle}>
              Welcome back! 👋
            </Text>
            <Text variant="bodyMedium" style={styles.welcomeSubtitle}>
              Here&apos;s your ferry business overview
            </Text>
          </View>
          <MaterialCommunityIcons
            name="ferry"
            size={48}
            color={theme.colors.primary}
          />
        </View>
      </Card.Content>
    </Card>
  );

  const renderStatsCards = () => (
    <View style={styles.statsContainer}>
      {/* Boats Stats */}
      <Card style={styles.statsCard}>
        <Card.Content style={styles.statsContent}>
          <View style={styles.statsHeader}>
            <MaterialCommunityIcons
              name="ferry"
              size={32}
              color={colors.primary}
            />
            <Text variant="titleLarge" style={styles.statsNumber}>
              {stats.boats.total}
            </Text>
          </View>
          <Text variant="titleMedium" style={styles.statsTitle}>
            Total Boats
          </Text>
          <View style={styles.statsDetails}>
            <Text variant="bodySmall" style={styles.statsDetail}>
              {stats.boats.active} active • {stats.boats.capacity} total seats
            </Text>
            <Text variant="bodySmall" style={styles.statsDetail}>
              {stats.boats.with_schedules} with schedules
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Schedules Stats */}
      <Card style={styles.statsCard}>
        <Card.Content style={styles.statsContent}>
          <View style={styles.statsHeader}>
            <MaterialCommunityIcons
              name="calendar"
              size={32}
              color={colors.success}
            />
            <Text variant="titleLarge" style={styles.statsNumber}>
              {stats.schedules.active}
            </Text>
          </View>
          <Text variant="titleMedium" style={styles.statsTitle}>
            Active Schedules
          </Text>
          <View style={styles.statsDetails}>
            <Text variant="bodySmall" style={styles.statsDetail}>
              {stats.schedules.upcoming} upcoming departures
            </Text>
            <Text variant="bodySmall" style={styles.statsDetail}>
              {stats.schedules.draft} drafts
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Revenue Stats */}
      <Card style={styles.statsCard}>
        <Card.Content style={styles.statsContent}>
          <View style={styles.statsHeader}>
            <MaterialCommunityIcons
              name="currency-usd"
              size={32}
              color={colors.info}
            />
            <Text variant="titleLarge" style={styles.statsNumber}>
              {stats.revenue.this_month.toFixed(0)}
            </Text>
          </View>
          <Text variant="titleMedium" style={styles.statsTitle}>
            Revenue (MVR)
          </Text>
          <View style={styles.statsDetails}>
            <Text variant="bodySmall" style={styles.statsDetail}>
              This month
            </Text>
            <Text variant="bodySmall" style={styles.statsDetail}>
              {stats.revenue.total_bookings} total bookings
            </Text>
          </View>
        </Card.Content>
      </Card>
    </View>
  );

  const renderQuickActions = () => (
    <Surface style={styles.quickActionsContainer} elevation={1}>
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Quick Actions
      </Text>
      <View style={styles.quickActions}>
        {quickActions.map((action, index) => (
          <Button
            key={index}
            mode="outlined"
            onPress={action.onPress}
            style={[styles.quickActionButton, { borderColor: action.color }]}
            labelStyle={{ color: action.color }}
            icon={({ size }) => (
              <MaterialCommunityIcons
                name={action.icon as any}
                size={size}
                color={action.color}
              />
            )}
          >
            {action.title}
          </Button>
        ))}
      </View>
    </Surface>
  );

  const renderRecentActivity = () => (
    <Surface style={styles.recentActivityContainer} elevation={1}>
      <View style={styles.sectionHeader}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Recent Activity
        </Text>
        <Button mode="text" onPress={() => navigation.navigate('Activity')}>
          View All
        </Button>
      </View>

      <View style={styles.activityList}>
        <View style={styles.activityItem}>
          <MaterialCommunityIcons
            name="ticket"
            size={20}
            color={colors.success}
          />
          <View style={styles.activityContent}>
            <Text variant="bodyMedium">5 new bookings today</Text>
            <Text variant="bodySmall" style={styles.activityTime}>
              2 hours ago
            </Text>
          </View>
        </View>

        <View style={styles.activityItem}>
          <MaterialCommunityIcons
            name="calendar-check"
            size={20}
            color={colors.info}
          />
          <View style={styles.activityContent}>
            <Text variant="bodyMedium">Morning route completed</Text>
            <Text variant="bodySmall" style={styles.activityTime}>
              4 hours ago
            </Text>
          </View>
        </View>

        <View style={styles.activityItem}>
          <MaterialCommunityIcons
            name="ferry"
            size={20}
            color={colors.primary}
          />
          <View style={styles.activityContent}>
            <Text variant="bodyMedium">Boat inspection due in 3 days</Text>
            <Text variant="bodySmall" style={styles.activityTime}>
              1 day ago
            </Text>
          </View>
        </View>
      </View>
    </Surface>
  );

  const renderUpcomingSchedules = () => (
    <Surface style={styles.upcomingContainer} elevation={1}>
      <View style={styles.sectionHeader}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Upcoming Departures
        </Text>
        <Button mode="text" onPress={() => navigation.navigate('Schedules')}>
          View All
        </Button>
      </View>

      <View style={styles.upcomingList}>
        <View style={styles.upcomingItem}>
          <View style={styles.upcomingTime}>
            <Text variant="titleSmall">08:30</Text>
            <Text variant="bodySmall">Today</Text>
          </View>
          <View style={styles.upcomingDetails}>
            <Text variant="bodyMedium" style={styles.upcomingRoute}>
              Malé → Hulhumalé
            </Text>
            <Text variant="bodySmall" style={styles.upcomingBoat}>
              Sea Eagle • 45/50 seats booked
            </Text>
          </View>
          <Chip mode="outlined" compact>
            Ready
          </Chip>
        </View>

        <View style={styles.upcomingItem}>
          <View style={styles.upcomingTime}>
            <Text variant="titleSmall">14:00</Text>
            <Text variant="bodySmall">Today</Text>
          </View>
          <View style={styles.upcomingDetails}>
            <Text variant="bodyMedium" style={styles.upcomingRoute}>
              Hulhumalé → Airport
            </Text>
            <Text variant="bodySmall" style={styles.upcomingBoat}>
              Ocean Rider • 12/30 seats booked
            </Text>
          </View>
          <Chip mode="outlined" compact>
            Ready
          </Chip>
        </View>
      </View>
    </Surface>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderWelcomeCard()}
        {renderStatsCards()}
        {renderQuickActions()}
        {renderUpcomingSchedules()}
        {renderRecentActivity()}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => {
          Alert.alert(
            'Quick Create',
            'What would you like to create?',
            [
              { text: 'Add Boat', onPress: () => navigation.navigate('AddBoat') },
              { text: 'Create Schedule', onPress: () => navigation.navigate('CreateSchedule') },
              { text: 'Cancel', style: 'cancel' },
            ]
          );
        }}
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
  welcomeCard: {
    margin: spacing.md,
    borderRadius: 16,
    backgroundColor: theme.colors.primaryContainer,
  },
  welcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeTitle: {
    fontWeight: 'bold',
    color: theme.colors.onPrimaryContainer,
  },
  welcomeSubtitle: {
    color: theme.colors.onPrimaryContainer,
    opacity: 0.8,
    marginTop: spacing.xs,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statsCard: {
    flex: 1,
    borderRadius: 12,
  },
  statsContent: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  statsHeader: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statsNumber: {
    fontWeight: 'bold',
    marginTop: spacing.xs,
    color: theme.colors.primary,
  },
  statsTitle: {
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  statsDetails: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  statsDetail: {
    opacity: 0.7,
    textAlign: 'center',
  },
  quickActionsContainer: {
    margin: spacing.md,
    marginTop: 0,
    borderRadius: 12,
    padding: spacing.md,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickActionButton: {
    flex: 1,
    minWidth: '45%',
  },
  upcomingContainer: {
    margin: spacing.md,
    marginTop: 0,
    borderRadius: 12,
    padding: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  upcomingList: {
    gap: spacing.md,
  },
  upcomingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  upcomingTime: {
    alignItems: 'center',
    minWidth: 60,
    marginRight: spacing.md,
  },
  upcomingDetails: {
    flex: 1,
  },
  upcomingRoute: {
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  upcomingBoat: {
    opacity: 0.7,
  },
  recentActivityContainer: {
    margin: spacing.md,
    marginTop: 0,
    borderRadius: 12,
    padding: spacing.md,
  },
  activityList: {
    gap: spacing.md,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  activityContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  activityTime: {
    opacity: 0.7,
    marginTop: spacing.xs,
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
