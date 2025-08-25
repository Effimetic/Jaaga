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
    Surface,
    Text,
} from '../compat/paper';
import { useAuth } from '../contexts/AuthContext';
import {
    agentManagementService,
    ConnectionWithStats
} from '../services/agentManagementService';
import { colors, spacing, theme } from '../theme/theme';

interface ConnectionFilters {
  status: 'ALL' | 'ACTIVE' | 'PENDING' | 'REJECTED';
}

export const AgentConnectionsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [connections, setConnections] = useState<ConnectionWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<ConnectionFilters>({
    status: 'ALL',
  });

  useFocusEffect(
    useCallback(() => {
      loadConnections();
    }, [loadConnections])
  );

  const loadConnections = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const result = await agentManagementService.getAgentConnections(user.id);
      
      if (result.success) {
        setConnections(result.data || []);
      } else {
        Alert.alert('Error', result.error || 'Failed to load connections');
      }
    } catch (error) {
      console.error('Failed to load connections:', error);
      Alert.alert('Error', 'Failed to load connections');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConnections();
    setRefreshing(false);
  };

  const getFilteredConnections = () => {
    let filtered = connections;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(connection =>
        connection.owner.brand_name?.toLowerCase().includes(query) ||
        connection.owner.business_name?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (filters.status !== 'ALL') {
      filtered = filtered.filter(connection => connection.status === filters.status);
    }

    return filtered;
  };

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

  const formatCurrency = (amount: number) => `MVR ${amount.toFixed(2)}`;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const handleConnectionAction = (connection: ConnectionWithStats) => {
    switch (connection.status) {
      case 'ACTIVE':
        navigation.navigate('SearchBoats', { ownerId: connection.owner_id });
        break;
      case 'PENDING':
        Alert.alert(
          'Connection Pending',
          'Your connection request is waiting for approval from the owner.',
          [{ text: 'OK' }]
        );
        break;
      case 'REJECTED':
        Alert.alert(
          'Connection Rejected',
          'This connection request was rejected. You can try sending a new request.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Try Again', onPress: () => navigation.navigate('FindOwners') },
          ]
        );
        break;
    }
  };

  const renderConnectionCard = (connection: ConnectionWithStats) => (
    <Card key={connection.id} style={styles.connectionCard} onPress={() => handleConnectionAction(connection)}>
      <Card.Content style={styles.connectionContent}>
        <View style={styles.connectionHeader}>
          <View style={styles.connectionInfo}>
            <Text variant="titleMedium" style={styles.connectionName}>
              {connection.owner.brand_name || connection.owner.business_name}
            </Text>
            {connection.owner.brand_name && connection.owner.business_name && 
             connection.owner.brand_name !== connection.owner.business_name && (
              <Text variant="bodySmall" style={styles.businessName}>
                {connection.owner.business_name}
              </Text>
            )}
          </View>

          <Chip
            mode="flat"
            style={[
              styles.statusChip,
              { backgroundColor: getConnectionStatusColor(connection.status) + '20' }
            ]}
            textStyle={{ color: getConnectionStatusColor(connection.status), fontSize: 11 }}
            icon={() => (
              <MaterialCommunityIcons
                name={getConnectionStatusIcon(connection.status)}
                size={14}
                color={getConnectionStatusColor(connection.status)}
              />
            )}
          >
            {connection.status}
          </Chip>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.connectionStats}>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="ticket" size={16} color={theme.colors.primary} />
              <Text variant="bodySmall" style={styles.statText}>
                {connection.booking_count} bookings
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="calendar" size={16} color={theme.colors.primary} />
              <Text variant="bodySmall" style={styles.statText}>
                Last: {formatDate(connection.last_booking_date)}
              </Text>
            </View>
          </View>

          {connection.status === 'ACTIVE' && (
            <View style={styles.creditRow}>
              <View style={styles.creditItem}>
                <Text variant="bodySmall" style={styles.creditLabel}>Available Credit</Text>
                <Text variant="titleSmall" style={[styles.creditAmount, { color: colors.success }]}>
                  {formatCurrency(connection.current_balance || 0)}
                </Text>
              </View>
              
              <View style={styles.creditItem}>
                <Text variant="bodySmall" style={styles.creditLabel}>Credit Limit</Text>
                <Text variant="titleSmall" style={styles.creditAmount}>
                  {formatCurrency(connection.credit_limit || 0)}
                </Text>
              </View>
              
              <View style={styles.creditItem}>
                <Text variant="bodySmall" style={styles.creditLabel}>Outstanding</Text>
                <Text variant="titleSmall" style={[styles.creditAmount, { color: colors.warning }]}>
                  {formatCurrency(connection.outstanding_amount || 0)}
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.connectionActions}>
          {connection.status === 'ACTIVE' && (
            <>
              <Button
                mode="contained"
                onPress={() => navigation.navigate('SearchBoats', { ownerId: connection.owner_id })}
                style={styles.actionButton}
                compact
              >
                Book Now
              </Button>
              <Button
                mode="text"
                onPress={() => navigation.navigate('CreditHistory', { ownerId: connection.owner_id })}
                compact
              >
                Credit History
              </Button>
            </>
          )}
          
          {connection.status === 'PENDING' && (
            <Text variant="bodySmall" style={styles.pendingText}>
              Waiting for owner approval...
            </Text>
          )}
          
          {connection.status === 'REJECTED' && (
            <Button
              mode="outlined"
              onPress={() => navigation.navigate('FindOwners')}
              style={styles.actionButton}
              compact
            >
              Send New Request
            </Button>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterChips}
      >
        {[
          { key: 'ALL', label: 'All Connections' },
          { key: 'ACTIVE', label: 'Active' },
          { key: 'PENDING', label: 'Pending' },
          { key: 'REJECTED', label: 'Rejected' },
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
      </ScrollView>
    </View>
  );

  const renderEmptyState = () => {
    const isFiltered = searchQuery.trim() || filters.status !== 'ALL';
    
    return (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons
          name={isFiltered ? "filter-off-outline" : "account-network-outline"}
          size={64}
          color={theme.colors.onSurfaceVariant}
        />
        <Text variant="headlineSmall" style={styles.emptyTitle}>
          {isFiltered ? 'No connections found' : 'No connections yet'}
        </Text>
        <Text variant="bodyMedium" style={styles.emptySubtitle}>
          {isFiltered
            ? 'Try adjusting your search or filters'
            : 'Connect with boat owners to start booking ferry services for your customers'
          }
        </Text>

        {!isFiltered && (
          <Button
            mode="contained"
            onPress={() => navigation.navigate('FindOwners')}
            style={styles.emptyAction}
            icon="account-search"
          >
            Find Boat Owners
          </Button>
        )}
      </View>
    );
  };

  const renderConnectionsList = () => {
    const filteredConnections = getFilteredConnections();

    if (filteredConnections.length === 0) {
      return renderEmptyState();
    }

    return (
      <View style={styles.connectionsList}>
        {filteredConnections.map(renderConnectionCard)}
      </View>
    );
  };

  const renderSummaryStats = () => {
    const filteredConnections = getFilteredConnections();
    const activeConnections = filteredConnections.filter(c => c.status === 'ACTIVE').length;
    const totalBookings = filteredConnections.reduce((sum, c) => sum + c.booking_count, 0);
    const totalCreditLimit = filteredConnections
      .filter(c => c.status === 'ACTIVE')
      .reduce((sum, c) => sum + (c.credit_limit || 0), 0);

    if (connections.length === 0) return null;

    return (
      <Surface style={styles.summaryContainer} elevation={1}>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}>
            <Text variant="titleLarge" style={styles.summaryNumber}>
              {filteredConnections.length}
            </Text>
            <Text variant="bodySmall" style={styles.summaryLabel}>
              Total Connections
            </Text>
          </View>

          <View style={styles.summaryStat}>
            <Text variant="titleLarge" style={styles.summaryNumber}>
              {activeConnections}
            </Text>
            <Text variant="bodySmall" style={styles.summaryLabel}>
              Active
            </Text>
          </View>

          <View style={styles.summaryStat}>
            <Text variant="titleLarge" style={styles.summaryNumber}>
              {totalBookings}
            </Text>
            <Text variant="bodySmall" style={styles.summaryLabel}>
              Total Bookings
            </Text>
          </View>

          <View style={styles.summaryStat}>
            <Text variant="titleLarge" style={styles.summaryNumber}>
              {formatCurrency(totalCreditLimit).replace('MVR ', '')}
            </Text>
            <Text variant="bodySmall" style={styles.summaryLabel}>
              Credit Limit (MVR)
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
        <View style={styles.searchBar}>
          <Text variant="titleMedium" style={styles.searchBarText}>
            Search connections by owner name...
          </Text>
        </View>

        {/* Summary Stats */}
        {renderSummaryStats()}

        {/* Filters */}
        {connections.length > 0 && renderFilters()}

        {/* Connections List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text variant="bodyMedium">Loading connections...</Text>
          </View>
        ) : (
          renderConnectionsList()
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
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
  searchBarText: {
    opacity: 0.7,
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
    textAlign: 'center',
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
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  connectionsList: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  connectionCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  connectionContent: {
    padding: spacing.md,
  },
  connectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  connectionInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  connectionName: {
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  businessName: {
    opacity: 0.7,
  },
  statusChip: {
    height: 28,
  },
  divider: {
    marginBottom: spacing.md,
  },
  connectionStats: {
    marginBottom: spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statText: {
    opacity: 0.8,
  },
  creditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 8,
    padding: spacing.sm,
  },
  creditItem: {
    alignItems: 'center',
  },
  creditLabel: {
    opacity: 0.7,
    marginBottom: spacing.xs,
  },
  creditAmount: {
    fontWeight: '600',
  },
  connectionActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    marginRight: spacing.sm,
  },
  pendingText: {
    opacity: 0.7,
    fontStyle: 'italic',
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
    height: 80,
  },
});
