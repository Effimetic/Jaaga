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
    Divider,
    FAB,
    ProgressBar,
    Surface,
    Text,
} from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import {
    agentManagementService,
    AgentStats,
    ConnectionWithStats
} from '../services/agentManagementService';
import { colors, spacing, theme } from '../theme/theme';

interface CreditSummary {
  totalLimit: number;
  availableCredit: number;
  usedCredit: number;
  utilizationRate: number;
}

export const AgentDashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<AgentStats>({
    total_connections: 0,
    active_connections: 0,
    total_credit_limit: 0,
    available_credit: 0,
    pending_requests: 0,
    total_bookings_this_month: 0,
  });
  const [connections, setConnections] = useState<ConnectionWithStats[]>([]);
  const [creditSummary, setCreditSummary] = useState<CreditSummary>({
    totalLimit: 0,
    availableCredit: 0,
    usedCredit: 0,
    utilizationRate: 0,
  });
  const [, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Load agent statistics
      const agentStats = await agentManagementService.getAgentStats(user.id);
      setStats(agentStats);

      // Load connections
      const connectionsResult = await agentManagementService.getAgentConnections(user.id);
      if (connectionsResult.success) {
        setConnections(connectionsResult.data || []);
      }

      // Calculate credit summary
      const activeConnections = connectionsResult.data?.filter(c => c.status === 'APPROVED') || [];
      const totalLimit = activeConnections.reduce((sum, c) => sum + (c.credit_limit || 0), 0);
      const usedCredit = activeConnections.reduce((sum, c) => sum + (c.outstanding_amount || 0), 0);
      const availableCredit = totalLimit - usedCredit;
      const utilizationRate = totalLimit > 0 ? (usedCredit / totalLimit) * 100 : 0;

      setCreditSummary({
        totalLimit,
        availableCredit,
        usedCredit,
        utilizationRate,
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
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

  const formatCurrency = (amount: number) => `MVR ${amount.toFixed(2)}`;

  const getConnectionStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return colors.success;
      case 'PENDING':
        return colors.warning;
      case 'REJECTED':
        return colors.error;
      default:
        return theme.colors.onSurfaceVariant;
    }
  };

  const getConnectionStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'check-circle';
      case 'PENDING':
        return 'clock-outline';
      case 'REJECTED':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const getCreditHealthColor = (utilizationRate: number) => {
    if (utilizationRate <= 50) return colors.success;
    if (utilizationRate <= 80) return colors.warning;
    return colors.error;
  };

  const renderWelcomeCard = () => (
    <Card style={styles.welcomeCard}>
      <Card.Content>
        <View style={styles.welcomeHeader}>
          <View>
            <Text variant="headlineSmall" style={styles.welcomeTitle}>
              Welcome back! 🎯
            </Text>
            <Text variant="bodyMedium" style={styles.welcomeSubtitle}>
              Ready to serve your customers today
            </Text>
          </View>
          <MaterialCommunityIcons
            name="account-tie"
            size={48}
            color={theme.colors.primary}
          />
        </View>
      </Card.Content>
    </Card>
  );

  const renderStatsCards = () => (
    <View style={styles.statsContainer}>
      {/* Connections Stats */}
      <Card style={styles.statsCard}>
        <Card.Content style={styles.statsContent}>
          <View style={styles.statsHeader}>
            <MaterialCommunityIcons
              name="account-network"
              size={32}
              color={colors.primary}
            />
            <Text variant="titleLarge" style={styles.statsNumber}>
              {stats.active_connections}
            </Text>
          </View>
          <Text variant="titleMedium" style={styles.statsTitle}>
            Active Connections
          </Text>
          <View style={styles.statsDetails}>
            <Text variant="bodySmall" style={styles.statsDetail}>
              {stats.total_connections} total connections
            </Text>
            {stats.pending_requests > 0 && (
              <Text variant="bodySmall" style={[styles.statsDetail, { color: colors.warning }]}>
                {stats.pending_requests} pending
              </Text>
            )}
          </View>
        </Card.Content>
      </Card>

      {/* Bookings Stats */}
      <Card style={styles.statsCard}>
        <Card.Content style={styles.statsContent}>
          <View style={styles.statsHeader}>
            <MaterialCommunityIcons
              name="ticket"
              size={32}
              color={colors.info}
            />
            <Text variant="titleLarge" style={styles.statsNumber}>
              {stats.total_bookings_this_month}
            </Text>
          </View>
          <Text variant="titleMedium" style={styles.statsTitle}>
            Bookings
          </Text>
          <View style={styles.statsDetails}>
            <Text variant="bodySmall" style={styles.statsDetail}>
              This month
            </Text>
          </View>
        </Card.Content>
      </Card>
    </View>
  );

  const renderCreditOverview = () => (
    <Surface style={styles.creditOverview} elevation={1}>
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Credit Overview
      </Text>

      <View style={styles.creditSummaryCard}>
        <View style={styles.creditRow}>
          <Text variant="bodyMedium">Total Credit Limit</Text>
          <Text variant="titleMedium" style={styles.creditAmount}>
            {formatCurrency(creditSummary.totalLimit)}
          </Text>
        </View>

        <View style={styles.creditRow}>
          <Text variant="bodyMedium">Available Credit</Text>
          <Text variant="titleMedium" style={[styles.creditAmount, { color: colors.success }]}>
            {formatCurrency(creditSummary.availableCredit)}
          </Text>
        </View>

        <View style={styles.creditRow}>
          <Text variant="bodyMedium">Used Credit</Text>
          <Text variant="titleMedium" style={[styles.creditAmount, { color: colors.warning }]}>
            {formatCurrency(creditSummary.usedCredit)}
          </Text>
        </View>

        <Divider style={styles.creditDivider} />

        <View style={styles.creditUtilization}>
          <View style={styles.utilizationHeader}>
            <Text variant="bodyMedium">Credit Utilization</Text>
            <Text 
              variant="titleSmall" 
              style={[styles.utilizationRate, { color: getCreditHealthColor(creditSummary.utilizationRate) }]}
            >
              {creditSummary.utilizationRate.toFixed(1)}%
            </Text>
          </View>
          <ProgressBar
            progress={creditSummary.utilizationRate / 100}
            color={getCreditHealthColor(creditSummary.utilizationRate)}
            style={styles.progressBar}
          />
        </View>
      </View>

      <Button
        mode="outlined"
        onPress={() => navigation.navigate('CreditHistory')}
        style={styles.creditHistoryButton}
        icon="history"
      >
        View Credit History
      </Button>
    </Surface>
  );

  const renderQuickActions = () => (
    <Surface style={styles.quickActionsContainer} elevation={1}>
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Quick Actions
      </Text>
      <View style={styles.quickActions}>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('SearchBoats')}
          style={styles.quickActionButton}
          icon="magnify"
        >
          Search Boats
        </Button>
        <Button
          mode="outlined"
          onPress={() => navigation.navigate('FindOwners')}
          style={styles.quickActionButton}
          icon="account-search"
        >
          Find Owners
        </Button>
        <Button
          mode="outlined"
          onPress={() => navigation.navigate('MyBookings')}
          style={styles.quickActionButton}
          icon="ticket-account"
        >
          My Bookings
        </Button>
        <Button
          mode="outlined"
          onPress={() => navigation.navigate('AgentConnections')}
          style={styles.quickActionButton}
          icon="account-network"
        >
          Connections
        </Button>
        <Button
          mode="outlined"
          onPress={() => navigation.navigate('AgentCommissions')}
          style={styles.quickActionButton}
          icon="percent"
        >
          My Commissions
        </Button>
      </View>
    </Surface>
  );

  const renderActiveConnections = () => {
    const activeConnections = connections.filter(c => c.status === 'APPROVED').slice(0, 3);

    if (activeConnections.length === 0) {
      return (
        <Surface style={styles.connectionsContainer} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Active Connections
          </Text>
          <View style={styles.emptyConnections}>
            <MaterialCommunityIcons
              name="account-network-outline"
              size={48}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="bodyMedium" style={styles.emptyConnectionsText}>
              No active connections yet
            </Text>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('FindOwners')}
              style={styles.findOwnersButton}
              icon="account-search"
            >
              Find Boat Owners
            </Button>
          </View>
        </Surface>
      );
    }

    return (
      <Surface style={styles.connectionsContainer} elevation={1}>
        <View style={styles.sectionHeader}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Active Connections
          </Text>
          <Button
            mode="text"
            onPress={() => navigation.navigate('AgentConnections')}
          >
            View All
          </Button>
        </View>

        <View style={styles.connectionsList}>
          {activeConnections.map((connection) => (
            <Card key={connection.id} style={styles.connectionCard}>
              <Card.Content style={styles.connectionContent}>
                <View style={styles.connectionHeader}>
                  <View style={styles.connectionInfo}>
                                      <Text variant="titleSmall" style={styles.connectionName}>
                    {connection.owner.brand_name || 'Unnamed Owner'}
                  </Text>
                    <View style={styles.connectionStats}>
                      <Text variant="bodySmall" style={styles.connectionStat}>
                        {connection.booking_count} bookings
                      </Text>
                      <Text variant="bodySmall" style={styles.connectionStat}>
                        Outstanding: {formatCurrency(connection.outstanding_amount || 0)}
                      </Text>
                    </View>
                  </View>
                  <Chip
                    mode="flat"
                    style={[
                      styles.statusChip,
                      { backgroundColor: getConnectionStatusColor(connection.status) + '20' }
                    ]}
                    textStyle={{ color: getConnectionStatusColor(connection.status), fontSize: 10 }}
                    icon={() => (
                      <MaterialCommunityIcons
                        name={getConnectionStatusIcon(connection.status)}
                        size={12}
                        color={getConnectionStatusColor(connection.status)}
                      />
                    )}
                  >
                    {connection.status}
                  </Chip>
                </View>

                <View style={styles.connectionActions}>
                  <Button
                    mode="text"
                    onPress={() => navigation.navigate('SearchBoats', { ownerId: connection.owner_id })}
                    compact
                  >
                    Book Now
                  </Button>
                  <Button
                    mode="text"
                    onPress={() => navigation.navigate('ConnectionDetails', { connectionId: connection.id })}
                    compact
                  >
                    Details
                  </Button>
                </View>
              </Card.Content>
            </Card>
          ))}
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
        {renderWelcomeCard()}
        {renderStatsCards()}
        {renderCreditOverview()}
        {renderQuickActions()}
        {renderActiveConnections()}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => {
          Alert.alert(
            'Quick Action',
            'What would you like to do?',
            [
              { text: 'Search Boats', onPress: () => navigation.navigate('SearchBoats') },
              { text: 'Find Owners', onPress: () => navigation.navigate('FindOwners') },
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
  creditOverview: {
    margin: spacing.md,
    marginTop: 0,
    borderRadius: 12,
    padding: spacing.md,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  creditSummaryCard: {
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  creditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  creditAmount: {
    fontWeight: '600',
  },
  creditDivider: {
    marginVertical: spacing.sm,
  },
  creditUtilization: {
    marginTop: spacing.sm,
  },
  utilizationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  utilizationRate: {
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  creditHistoryButton: {
    alignSelf: 'flex-start',
  },
  quickActionsContainer: {
    margin: spacing.md,
    marginTop: 0,
    borderRadius: 12,
    padding: spacing.md,
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
  connectionsContainer: {
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
  emptyConnections: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyConnectionsText: {
    opacity: 0.7,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  findOwnersButton: {
    marginTop: spacing.sm,
  },
  connectionsList: {
    gap: spacing.sm,
  },
  connectionCard: {
    borderRadius: 8,
  },
  connectionContent: {
    paddingVertical: spacing.sm,
  },
  connectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  connectionInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  connectionName: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  connectionStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  connectionStat: {
    opacity: 0.7,
  },
  statusChip: {
    height: 24,
  },
  connectionActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
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
