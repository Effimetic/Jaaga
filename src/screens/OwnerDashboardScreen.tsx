
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {
    Button,
    Card,
    Chip,
    Surface,
    Text,
} from '../compat/paper';
  Text,
} from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { boatManagementService } from '../services/boatManagementService';
import { scheduleManagementService } from '../services/scheduleManagementService';
import { spacing } from '../theme/theme';

interface DashboardStats {
  boats: {
    total: number;
    active: number;
    capacity: number;
    with_schedules: number;
  };
  schedules: {
    upcoming: number;
    today: number;
    sold_out: number;
  };
  sales: {
    today_revenue: number;
    month_revenue: number;
    tickets_sold: number;
  };
}

interface QuickAction {
  title: string;
  icon: string;
  onPress: () => void;
}

export const OwnerDashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    boats: { total: 0, active: 0, capacity: 0, with_schedules: 0 },
    schedules: { total: 0, active: 0, draft: 0, upcoming: 0 },
    revenue: { this_month: 0, total_bookings: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
      // Don't show alert, just log the error
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const quickActions: QuickAction[] = [
    {
      title: 'My Boats',
      icon: 'ferry',
      onPress: () => navigation.navigate('MyBoats'),
    },
    {
      title: 'Add Boat',
      icon: 'plus-circle',
      onPress: () => navigation.navigate('AddBoat'),
    },
    {
      title: 'Schedules',
      icon: 'calendar',
      onPress: () => navigation.navigate('ScheduleManagement'),
    },
    {
      title: 'Financials',
      icon: 'chart-line',
      onPress: () => navigation.navigate('OwnerFinancials'),
    },
  ];

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Owner Dashboard</Text>
      <Text style={styles.headerSubtitle}>Welcome back, {user?.phone?.slice(-4)}</Text>
    </View>
  );

  const renderStatsGrid = () => (
    <View style={styles.statsGrid}>
      {/* Boats Card */}
      <TouchableOpacity 
        style={styles.statCard}
        onPress={() => navigation.navigate('MyBoats')}
      >
        <View style={styles.statIconContainer}>
          <MaterialCommunityIcons name="ferry" size={24} color="#000" />
        </View>
        <Text style={styles.statNumber}>{stats.boats.total}</Text>
        <Text style={styles.statLabel}>Boats</Text>
        <Text style={styles.statDetail}>{stats.boats.active} active</Text>
      </TouchableOpacity>

      {/* Schedules Card */}
      <TouchableOpacity 
        style={styles.statCard}
        onPress={() => navigation.navigate('ScheduleManagement')}
      >
        <View style={styles.statIconContainer}>
          <MaterialCommunityIcons name="calendar" size={24} color="#000" />
        </View>
        <Text style={styles.statNumber}>{stats.schedules.active}</Text>
        <Text style={styles.statLabel}>Active Schedules</Text>
        <Text style={styles.statDetail}>{stats.schedules.upcoming} upcoming</Text>
      </TouchableOpacity>

      {/* Revenue Card */}
      <TouchableOpacity 
        style={styles.statCard}
        onPress={() => navigation.navigate('OwnerFinancials')}
      >
        <View style={styles.statIconContainer}>
          <MaterialCommunityIcons name="currency-usd" size={24} color="#000" />
        </View>
        <Text style={styles.statNumber}>MVR {stats.revenue.this_month.toLocaleString()}</Text>
        <Text style={styles.statLabel}>This Month</Text>
        <Text style={styles.statDetail}>{stats.revenue.total_bookings} bookings</Text>
      </TouchableOpacity>

      {/* Capacity Card */}
      <TouchableOpacity 
        style={styles.statCard}
        onPress={() => navigation.navigate('MyBoats')}
      >
        <View style={styles.statIconContainer}>
          <MaterialCommunityIcons name="seat" size={24} color="#000" />
        </View>
        <Text style={styles.statNumber}>{stats.boats.capacity}</Text>
        <Text style={styles.statLabel}>Total Seats</Text>
        <Text style={styles.statDetail}>{stats.boats.with_schedules} scheduled</Text>
      </TouchableOpacity>
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.quickActionsSection}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActionsGrid}>
        {quickActions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={styles.actionCard}
            onPress={action.onPress}
          >
            <View style={styles.actionIconContainer}>
              <MaterialCommunityIcons name={action.icon as any} size={28} color="#000" />
            </View>
            <Text style={styles.actionTitle}>{action.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderRecentActivity = () => (
    <View style={styles.recentActivitySection}>
      <Text style={styles.sectionTitle}>Recent Activity</Text>
      <View style={styles.activityList}>
        <View style={styles.activityItem}>
          <View style={styles.activityIcon}>
            <MaterialCommunityIcons name="ferry" size={16} color="#000" />
          </View>
          <View style={styles.activityContent}>
            <Text style={styles.activityTitle}>Boat &quot;Island Express&quot; added</Text>
            <Text style={styles.activityTime}>2 hours ago</Text>
          </View>
        </View>
        
        <View style={styles.activityItem}>
          <View style={styles.activityIcon}>
            <MaterialCommunityIcons name="calendar" size={16} color="#000" />
          </View>
          <View style={styles.activityContent}>
            <Text style={styles.activityTitle}>New schedule created for tomorrow</Text>
            <Text style={styles.activityTime}>5 hours ago</Text>
          </View>
        </View>
        
        <View style={styles.activityItem}>
          <View style={styles.activityIcon}>
            <MaterialCommunityIcons name="currency-usd" size={16} color="#000" />
          </View>
          <View style={styles.activityContent}>
            <Text style={styles.activityTitle}>Payment received: MVR 2,500</Text>
            <Text style={styles.activityTime}>1 day ago</Text>
          </View>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading dashboard...</Text>
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
        {renderWelcomeCard()}
        {renderStatsCards()}
        {renderQuickActions()}
        {renderUpcomingSchedules()}
        {renderRecentActivity()}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Removed FAB */}
    </View>
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      {renderHeader()}
      {renderStatsGrid()}
      {renderQuickActions()}
      {renderRecentActivity()}
      
      {/* Bottom spacing */}
      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.md,
    gap: spacing.sm,
  },
  statCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: spacing.xs,
  },
  statDetail: {
    fontSize: 12,
    color: '#666',
  },
  quickActionsSection: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: spacing.md,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  recentActivitySection: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  activityList: {
    gap: spacing.md,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: spacing.xs,
  },
  activityTime: {
    fontSize: 12,
    color: '#666',
  },
  bottomSpacing: {
    height: spacing.xl,
  },
});
