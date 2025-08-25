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
} from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { accountingService } from '../services/accountingService';
import { agentManagementService, ConnectionWithStats } from '../services/agentManagementService';
import { colors, spacing, theme } from '../theme/theme';
import { AgentCommissions, LedgerEntry } from '../types';

interface PeriodFilter {
  label: string;
  value: string;
  startDate: string;
  endDate: string;
}

interface CommissionSummary {
  total_gross_commission: number;
  total_platform_fee: number;
  total_net_commission: number;
  total_bookings: number;
  connections_with_earnings: number;
}

export const AgentCommissionsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [commissions, setCommissions] = useState<AgentCommissions | null>(null);
  const [connections, setConnections] = useState<ConnectionWithStats[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [summary, setSummary] = useState<CommissionSummary>({
    total_gross_commission: 0,
    total_platform_fee: 0,
    total_net_commission: 0,
    total_bookings: 0,
    connections_with_earnings: 0,
  });
  const [selectedPeriod, setSelectedPeriod] = useState('current_month');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const periods: PeriodFilter[] = [
    {
      label: 'This Month',
      value: 'current_month',
      startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
      endDate: new Date().toISOString(),
    },
    {
      label: 'Last Month',
      value: 'last_month',
      startDate: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString(),
      endDate: new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString(),
    },
    {
      label: 'Last 3 Months',
      value: 'last_3_months',
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString(),
      endDate: new Date().toISOString(),
    },
    {
      label: 'This Year',
      value: 'current_year',
      startDate: new Date(new Date().getFullYear(), 0, 1).toISOString(),
      endDate: new Date().toISOString(),
    },
  ];

  useFocusEffect(
    useCallback(() => {
      loadCommissionData();
    }, [loadCommissionData])
  );

  const loadCommissionData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      const period = periods.find(p => p.value === selectedPeriod);
      if (!period) return;

      // Load agent commissions
      const commissionsResult = await accountingService.getAgentCommissions(
        user.id,
        period.startDate,
        period.endDate
      );

      if (commissionsResult.success) {
        setCommissions(commissionsResult.data);
      }

      // Load connections for breakdown
      const connectionsResult = await agentManagementService.getAgentConnections(user.id);
      if (connectionsResult.success) {
        const activeConnections = connectionsResult.data?.filter(c => c.status === 'ACTIVE') || [];
        setConnections(activeConnections);

        // Calculate summary across all connections
        let totalGrossCommission = 0;
        let totalPlatformFee = 0;
        let totalNetCommission = 0;
        let totalBookings = 0;
        let connectionsWithEarnings = 0;

        for (const connection of activeConnections) {
          const connectionCommissions = await accountingService.getAgentCommissions(
            user.id,
            period.startDate,
            period.endDate
          );

          if (connectionCommissions.success && connectionCommissions.data) {
            const data = connectionCommissions.data;
            totalGrossCommission += data.gross_commission;
            totalPlatformFee += data.platform_fee;
            totalNetCommission += data.net_commission;
            totalBookings += data.total_bookings;
            
            if (data.gross_commission > 0) {
              connectionsWithEarnings++;
            }
          }
        }

        setSummary({
          total_gross_commission: totalGrossCommission,
          total_platform_fee: totalPlatformFee,
          total_net_commission: totalNetCommission,
          total_bookings: totalBookings,
          connections_with_earnings: connectionsWithEarnings,
        });
      }

      // Load recent commission ledger entries
      const ledgerResult = await accountingService.getLedgerEntries(
        'AGENT',
        user.id,
        period.startDate,
        period.endDate,
        20
      );

      if (ledgerResult.success) {
        const commissionEntries = ledgerResult.data?.filter(entry => 
          entry.account_type === 'COMMISSION'
        ) || [];
        setLedgerEntries(commissionEntries);
      }

    } catch (error) {
      console.error('Failed to load commission data:', error);
      Alert.alert('Error', 'Failed to load commission data');
    } finally {
      setLoading(false);
    }
  }, [user?.id, selectedPeriod]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCommissionData();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => `MVR ${amount.toFixed(2)}`;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const renderPeriodSelector = () => (
    <Surface style={styles.periodSelector} elevation={1}>
      <Text variant="titleSmall" style={styles.sectionTitle}>
        Time Period
      </Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.periodOptions}
      >
        {periods.map((period) => (
          <Chip
            key={period.value}
            mode={selectedPeriod === period.value ? 'flat' : 'outlined'}
            selected={selectedPeriod === period.value}
            onPress={() => setSelectedPeriod(period.value)}
            style={styles.periodChip}
          >
            {period.label}
          </Chip>
        ))}
      </ScrollView>
    </Surface>
  );

  const renderCommissionOverview = () => {
    if (!commissions) return null;

    const commissionRate = commissions.gross_commission > 0 
      ? ((commissions.net_commission / commissions.gross_commission) * 100)
      : 0;

    return (
      <Surface style={styles.overviewContainer} elevation={1}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Commission Overview
        </Text>

        <View style={styles.overviewGrid}>
          <View style={styles.overviewItem}>
            <MaterialCommunityIcons name="chart-line" size={24} color={colors.success} />
            <Text variant="bodySmall" style={styles.overviewLabel}>Gross Commission</Text>
            <Text variant="titleMedium" style={[styles.overviewValue, { color: colors.success }]}>
              {formatCurrency(commissions.gross_commission)}
            </Text>
          </View>

          <View style={styles.overviewItem}>
            <MaterialCommunityIcons name="wallet-plus" size={24} color={theme.colors.primary} />
            <Text variant="bodySmall" style={styles.overviewLabel}>Net Commission</Text>
            <Text variant="titleMedium" style={[styles.overviewValue, { color: theme.colors.primary }]}>
              {formatCurrency(commissions.net_commission)}
            </Text>
          </View>

          <View style={styles.overviewItem}>
            <MaterialCommunityIcons name="ticket" size={24} color={colors.info} />
            <Text variant="bodySmall" style={styles.overviewLabel}>Total Bookings</Text>
            <Text variant="titleMedium" style={styles.overviewValue}>
              {commissions.total_bookings}
            </Text>
          </View>

          <View style={styles.overviewItem}>
            <MaterialCommunityIcons name="percent" size={24} color={colors.warning} />
            <Text variant="bodySmall" style={styles.overviewLabel}>Commission Rate</Text>
            <Text variant="titleMedium" style={styles.overviewValue}>
              {commissionRate.toFixed(1)}%
            </Text>
          </View>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.breakdownContainer}>
          <Text variant="titleSmall" style={styles.breakdownTitle}>
            Commission Breakdown
          </Text>
          
          <View style={styles.breakdownItems}>
            <View style={styles.breakdownRow}>
              <Text variant="bodyMedium">Gross Commission</Text>
              <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                {formatCurrency(commissions.gross_commission)}
              </Text>
            </View>

            <View style={styles.breakdownRow}>
              <Text variant="bodySmall" style={styles.deductionText}>
                Platform Fee (10%)
              </Text>
              <Text variant="bodySmall" style={[styles.deductionText, { color: colors.warning }]}>
                -{formatCurrency(commissions.platform_fee)}
              </Text>
            </View>

            <Divider style={styles.breakdownDivider} />

            <View style={styles.breakdownRow}>
              <Text variant="titleSmall" style={{ color: theme.colors.primary }}>
                Net Commission
              </Text>
              <Text variant="titleSmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                {formatCurrency(commissions.net_commission)}
              </Text>
            </View>

            {commissions.outstanding_amount > 0 && (
              <>
                <Divider style={styles.breakdownDivider} />
                <View style={styles.breakdownRow}>
                  <Text variant="bodySmall" style={{ color: colors.warning }}>
                    Outstanding Amount
                  </Text>
                  <Text variant="bodySmall" style={{ color: colors.warning, fontWeight: '600' }}>
                    {formatCurrency(commissions.outstanding_amount)}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>
      </Surface>
    );
  };

  const renderConnectionBreakdown = () => {
    if (!connections.length) return null;

    return (
      <Surface style={styles.connectionsContainer} elevation={1}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Commission by Connection
        </Text>

        <View style={styles.connectionsList}>
          {connections.map((connection) => (
            <Card key={connection.id} style={styles.connectionCard}>
              <Card.Content style={styles.connectionContent}>
                <View style={styles.connectionHeader}>
                  <Text variant="titleSmall" style={styles.connectionName}>
                    {connection.owner.brand_name || connection.owner.business_name}
                  </Text>
                  <View style={styles.connectionStats}>
                    <Text variant="bodySmall" style={styles.connectionStat}>
                      {connection.booking_count} bookings
                    </Text>
                  </View>
                </View>

                <View style={styles.connectionCommission}>
                  <View style={styles.commissionItem}>
                    <Text variant="bodySmall" style={styles.commissionLabel}>Estimated Commission</Text>
                    <Text variant="bodyMedium" style={[styles.commissionValue, { color: colors.success }]}>
                      {formatCurrency(connection.booking_count * 85)} {/* Estimated */}
                    </Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
          ))}
        </View>
      </Surface>
    );
  };

  const renderRecentCommissions = () => {
    if (!ledgerEntries.length) {
      return (
        <Surface style={styles.commissionsContainer} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Recent Commission Entries
          </Text>
          <View style={styles.emptyCommissions}>
            <MaterialCommunityIcons
              name="percent-outline"
              size={48}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="bodyMedium" style={styles.emptyText}>
              No commission entries found for this period
            </Text>
          </View>
        </Surface>
      );
    }

    return (
      <Surface style={styles.commissionsContainer} elevation={1}>
        <View style={styles.sectionHeader}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Recent Commission Entries
          </Text>
          <Button 
            mode="text" 
            onPress={() => navigation.navigate('AgentLedger')}
            compact
          >
            View All
          </Button>
        </View>

        <View style={styles.commissionsList}>
          {ledgerEntries.slice(0, 10).map((entry) => (
            <View key={entry.id} style={styles.commissionItem}>
              <View style={styles.commissionIcon}>
                <MaterialCommunityIcons
                  name="percent"
                  size={20}
                  color={colors.success}
                />
              </View>
              
              <View style={styles.commissionInfo}>
                <Text variant="bodyMedium" style={styles.commissionDescription}>
                  {entry.description}
                </Text>
                <Text variant="bodySmall" style={styles.commissionMeta}>
                  {entry.account_name} • {formatDate(entry.created_at)}
                </Text>
              </View>

              <View style={styles.commissionAmount}>
                <Text 
                  variant="bodyMedium" 
                  style={[styles.amountText, { color: colors.success }]}
                >
                  +{formatCurrency(entry.debit_amount || 0)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </Surface>
    );
  };

  const renderActionButtons = () => (
    <Surface style={styles.actionsContainer} elevation={1}>
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Commission Actions
      </Text>
      <View style={styles.actionButtons}>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('AgentReports')}
          style={styles.actionButton}
          icon="chart-bar"
        >
          Commission Reports
        </Button>
        <Button
          mode="outlined"
          onPress={() => navigation.navigate('AgentLedger')}
          style={styles.actionButton}
          icon="book-open-page-variant"
        >
          Full Ledger
        </Button>
        <Button
          mode="outlined"
          onPress={() => navigation.navigate('PayoutRequests')}
          style={styles.actionButton}
          icon="bank-transfer"
        >
          Request Payout
        </Button>
        <Button
          mode="outlined"
          onPress={() => navigation.navigate('TaxDocuments')}
          style={styles.actionButton}
          icon="receipt"
        >
          Tax Documents
        </Button>
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
        {renderPeriodSelector()}
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text variant="bodyMedium">Loading commission data...</Text>
          </View>
        ) : (
          <>
            {renderCommissionOverview()}
            {renderConnectionBreakdown()}
            {renderActionButtons()}
            {renderRecentCommissions()}
          </>
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
  periodSelector: {
    margin: spacing.md,
    borderRadius: 12,
    padding: spacing.md,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  periodOptions: {
    gap: spacing.sm,
  },
  periodChip: {
    marginRight: spacing.xs,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  overviewContainer: {
    margin: spacing.md,
    marginTop: 0,
    borderRadius: 12,
    padding: spacing.md,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  overviewItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 8,
    padding: spacing.md,
  },
  overviewLabel: {
    opacity: 0.7,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  overviewValue: {
    fontWeight: '600',
    textAlign: 'center',
  },
  divider: {
    marginVertical: spacing.md,
  },
  breakdownContainer: {
    marginTop: spacing.sm,
  },
  breakdownTitle: {
    fontWeight: '600',
    marginBottom: spacing.md,
    color: theme.colors.primary,
  },
  breakdownItems: {
    gap: spacing.sm,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deductionText: {
    opacity: 0.8,
  },
  breakdownDivider: {
    marginVertical: spacing.sm,
  },
  connectionsContainer: {
    margin: spacing.md,
    marginTop: 0,
    borderRadius: 12,
    padding: spacing.md,
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
    marginBottom: spacing.sm,
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
  connectionCommission: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  commissionItem: {
    alignItems: 'center',
  },
  commissionLabel: {
    opacity: 0.7,
    marginBottom: spacing.xs,
  },
  commissionValue: {
    fontWeight: '600',
  },
  actionsContainer: {
    margin: spacing.md,
    marginTop: 0,
    borderRadius: 12,
    padding: spacing.md,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
  },
  commissionsContainer: {
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
  emptyCommissions: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    opacity: 0.7,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  commissionsList: {
    gap: spacing.sm,
  },
  commissionIcon: {
    marginRight: spacing.md,
  },
  commissionInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  commissionDescription: {
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  commissionMeta: {
    opacity: 0.7,
  },
  commissionAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 80,
  },
});
