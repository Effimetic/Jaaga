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
    Chip,
    Divider,
    Surface,
    Text
} from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { accountingService } from '../services/accountingService';
import { colors, spacing, theme } from '../theme/theme';
import { FinancialSummary, LedgerEntry, OwnerEarnings } from '../types';

interface PeriodFilter {
  label: string;
  value: string;
  startDate: string;
  endDate: string;
}

export const OwnerFinancialsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [earnings, setEarnings] = useState<OwnerEarnings | null>(null);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
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
      loadFinancialData();
    }, [loadFinancialData])
  );

  const loadFinancialData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      const period = periods.find(p => p.value === selectedPeriod);
      if (!period) return;

      // Load owner earnings
      const earningsResult = await accountingService.getOwnerEarnings(
        user.id,
        period.startDate,
        period.endDate
      );

      if (earningsResult.success) {
        setEarnings(earningsResult.data);
      }

      // Load financial summary
      const summaryResult = await accountingService.getFinancialSummary(
        period.startDate,
        period.endDate,
        'OWNER',
        user.id
      );

      if (summaryResult.success) {
        setSummary(summaryResult.data);
      }

      // Load recent ledger entries
      const ledgerResult = await accountingService.getLedgerEntries(
        'OWNER',
        user.id,
        period.startDate,
        period.endDate,
        20
      );

      if (ledgerResult.success) {
        setLedgerEntries(ledgerResult.data || []);
      }

    } catch (error) {
      console.error('Failed to load financial data:', error);
      Alert.alert('Error', 'Failed to load financial data');
    } finally {
      setLoading(false);
    }
  }, [user?.id, selectedPeriod]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFinancialData();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => `MVR ${amount.toFixed(2)}`;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getAccountTypeColor = (accountType: string) => {
    switch (accountType) {
      case 'REVENUE':
        return colors.success;
      case 'COMMISSION':
        return colors.warning;
      case 'TAX':
        return colors.info;
      case 'PAYABLE':
        return colors.primary;
      default:
        return theme.colors.onSurfaceVariant;
    }
  };

  const getTransactionIcon = (accountType: string) => {
    switch (accountType) {
      case 'REVENUE':
        return 'trending-up';
      case 'COMMISSION':
        return 'percent';
      case 'TAX':
        return 'receipt';
      case 'PAYABLE':
        return 'bank-transfer-out';
      case 'RECEIVABLE':
        return 'bank-transfer-in';
      default:
        return 'currency-usd';
    }
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

  const renderEarningsOverview = () => {
    if (!earnings) return null;

    return (
      <Surface style={styles.overviewContainer} elevation={1}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Earnings Overview
        </Text>

        <View style={styles.overviewGrid}>
          <View style={styles.overviewItem}>
            <MaterialCommunityIcons name="chart-line" size={24} color={colors.success} />
            <Text variant="bodySmall" style={styles.overviewLabel}>Gross Revenue</Text>
            <Text variant="titleMedium" style={[styles.overviewValue, { color: colors.success }]}>
              {formatCurrency(earnings.gross_revenue)}
            </Text>
          </View>

          <View style={styles.overviewItem}>
            <MaterialCommunityIcons name="wallet-plus" size={24} color={theme.colors.primary} />
            <Text variant="bodySmall" style={styles.overviewLabel}>Net Earnings</Text>
            <Text variant="titleMedium" style={[styles.overviewValue, { color: theme.colors.primary }]}>
              {formatCurrency(earnings.net_earnings)}
            </Text>
          </View>

          <View style={styles.overviewItem}>
            <MaterialCommunityIcons name="ticket" size={24} color={colors.info} />
            <Text variant="bodySmall" style={styles.overviewLabel}>Total Bookings</Text>
            <Text variant="titleMedium" style={styles.overviewValue}>
              {earnings.total_bookings}
            </Text>
          </View>

          <View style={styles.overviewItem}>
            <MaterialCommunityIcons name="clock-time-eight" size={24} color={colors.warning} />
            <Text variant="bodySmall" style={styles.overviewLabel}>Outstanding</Text>
            <Text variant="titleMedium" style={[styles.overviewValue, { color: colors.warning }]}>
              {formatCurrency(earnings.outstanding_amount)}
            </Text>
          </View>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.breakdownContainer}>
          <Text variant="titleSmall" style={styles.breakdownTitle}>
            Revenue Breakdown
          </Text>
          
          <View style={styles.breakdownItems}>
            <View style={styles.breakdownRow}>
              <Text variant="bodyMedium">Gross Revenue</Text>
              <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                {formatCurrency(earnings.gross_revenue)}
              </Text>
            </View>

            <View style={styles.breakdownRow}>
              <Text variant="bodySmall" style={styles.deductionText}>
                Platform Commission ({((earnings.platform_commission / earnings.gross_revenue) * 100).toFixed(1)}%)
              </Text>
              <Text variant="bodySmall" style={[styles.deductionText, { color: colors.warning }]}>
                -{formatCurrency(earnings.platform_commission)}
              </Text>
            </View>

            {earnings.agent_commission > 0 && (
              <View style={styles.breakdownRow}>
                <Text variant="bodySmall" style={styles.deductionText}>
                  Agent Commission ({((earnings.agent_commission / earnings.gross_revenue) * 100).toFixed(1)}%)
                </Text>
                <Text variant="bodySmall" style={[styles.deductionText, { color: colors.warning }]}>
                  -{formatCurrency(earnings.agent_commission)}
                </Text>
              </View>
            )}

            <View style={styles.breakdownRow}>
              <Text variant="bodySmall" style={styles.deductionText}>
                Tax Amount
              </Text>
              <Text variant="bodySmall" style={[styles.deductionText, { color: colors.info }]}>
                -{formatCurrency(earnings.tax_amount)}
              </Text>
            </View>

            <Divider style={styles.breakdownDivider} />

            <View style={styles.breakdownRow}>
              <Text variant="titleSmall" style={{ color: theme.colors.primary }}>
                Net Earnings
              </Text>
              <Text variant="titleSmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                {formatCurrency(earnings.net_earnings)}
              </Text>
            </View>
          </View>
        </View>
      </Surface>
    );
  };

  const renderRecentTransactions = () => {
    if (!ledgerEntries.length) {
      return (
        <Surface style={styles.transactionsContainer} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Recent Transactions
          </Text>
          <View style={styles.emptyTransactions}>
            <MaterialCommunityIcons
              name="receipt-text-outline"
              size={48}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="bodyMedium" style={styles.emptyText}>
              No transactions found for this period
            </Text>
          </View>
        </Surface>
      );
    }

    return (
      <Surface style={styles.transactionsContainer} elevation={1}>
        <View style={styles.sectionHeader}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Recent Transactions
          </Text>
          <Button 
            mode="text" 
            onPress={() => navigation.navigate('OwnerLedger')}
            compact
          >
            View All
          </Button>
        </View>

        <View style={styles.transactionsList}>
          {ledgerEntries.slice(0, 10).map((entry) => (
            <View key={entry.id} style={styles.transactionItem}>
              <View style={styles.transactionIcon}>
                <MaterialCommunityIcons
                  name={getTransactionIcon(entry.account_type)}
                  size={20}
                  color={getAccountTypeColor(entry.account_type)}
                />
              </View>
              
              <View style={styles.transactionInfo}>
                <Text variant="bodyMedium" style={styles.transactionDescription}>
                  {entry.description}
                </Text>
                <Text variant="bodySmall" style={styles.transactionMeta}>
                  {entry.account_name} • {formatDate(entry.created_at)}
                </Text>
              </View>

              <View style={styles.transactionAmount}>
                <Text 
                  variant="bodyMedium" 
                  style={[
                    styles.amountText,
                    { 
                      color: entry.credit_amount 
                        ? colors.success 
                        : colors.warning
                    }
                  ]}
                >
                  {entry.credit_amount 
                    ? `+${formatCurrency(entry.credit_amount)}`
                    : `-${formatCurrency(entry.debit_amount || 0)}`
                  }
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
        Financial Actions
      </Text>
      <View style={styles.actionButtons}>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('OwnerReports')}
          style={styles.actionButton}
          icon="chart-bar"
        >
          View Reports
        </Button>
        <Button
          mode="outlined"
          onPress={() => navigation.navigate('OwnerLedger')}
          style={styles.actionButton}
          icon="book-open-page-variant"
        >
          Full Ledger
        </Button>
        <Button
          mode="outlined"
          onPress={() => navigation.navigate('PayoutHistory')}
          style={styles.actionButton}
          icon="bank-transfer"
        >
          Payout History
        </Button>
        <Button
          mode="outlined"
          onPress={() => navigation.navigate('TaxReports')}
          style={styles.actionButton}
          icon="receipt"
        >
          Tax Reports
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
            <Text variant="bodyMedium">Loading financial data...</Text>
          </View>
        ) : (
          <>
            {renderEarningsOverview()}
            {renderActionButtons()}
            {renderRecentTransactions()}
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
  transactionsContainer: {
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
  emptyTransactions: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    opacity: 0.7,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  transactionsList: {
    gap: spacing.sm,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  transactionIcon: {
    marginRight: spacing.md,
  },
  transactionInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  transactionDescription: {
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  transactionMeta: {
    opacity: 0.7,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 80,
  },
});
