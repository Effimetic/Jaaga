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
    Card,
    Chip,
    Surface,
    Text
} from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import {
    agentManagementService,
    ConnectionWithStats
} from '../services/agentManagementService';
import { colors, spacing, theme } from '../theme/theme';
import { CreditTransaction } from '../types';

interface CreditSummary {
  totalCredits: number;
  totalDebits: number;
  currentBalance: number;
  transactionCount: number;
}

export const CreditHistoryScreen: React.FC<{ navigation: any; route: any }> = ({ 
  navigation, 
  route 
}) => {
  const { user } = useAuth();
  const { ownerId } = route.params || {};
  
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [connections, setConnections] = useState<ConnectionWithStats[]>([]);
  const [selectedOwner, setSelectedOwner] = useState<string>(ownerId || 'all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<CreditSummary>({
    totalCredits: 0,
    totalDebits: 0,
    currentBalance: 0,
    transactionCount: 0,
  });

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const loadData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Load connections for filter options
      const connectionsResult = await agentManagementService.getAgentConnections(user.id);
      if (connectionsResult.success) {
        const activeConnections = connectionsResult.data?.filter(c => c.status === 'ACTIVE') || [];
        setConnections(activeConnections);
      }

      // Load credit history
      await loadCreditHistory();
    } catch (error) {
      console.error('Failed to load data:', error);
      Alert.alert('Error', 'Failed to load credit history');
    } finally {
      setLoading(false);
    }
  }, [user?.id, selectedOwner]);

  const loadCreditHistory = async () => {
    if (!user?.id) return;

    try {
      const ownerFilter = selectedOwner === 'all' ? undefined : selectedOwner;
      const result = await agentManagementService.getCreditHistory(user.id, ownerFilter, 100);
      
      if (result.success) {
        const creditHistory = result.data || [];
        setTransactions(creditHistory);

        // Calculate summary
        const totalCredits = creditHistory
          .filter(t => t.type === 'CREDIT')
          .reduce((sum, t) => sum + t.amount, 0);
        
        const totalDebits = creditHistory
          .filter(t => t.type === 'DEBIT')
          .reduce((sum, t) => sum + t.amount, 0);

        // Get current balance from connections
        let currentBalance = 0;
        if (selectedOwner === 'all') {
          currentBalance = connections
            .filter(c => c.status === 'ACTIVE')
            .reduce((sum, c) => sum + (c.current_balance || 0), 0);
        } else {
          const connection = connections.find(c => c.owner_id === selectedOwner);
          currentBalance = connection?.current_balance || 0;
        }

        setSummary({
          totalCredits,
          totalDebits,
          currentBalance,
          transactionCount: creditHistory.length,
        });
      } else {
        Alert.alert('Error', result.error || 'Failed to load credit history');
      }
    } catch (error) {
      console.error('Failed to load credit history:', error);
      Alert.alert('Error', 'Failed to load credit history');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCreditHistory();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => `MVR ${amount.toFixed(2)}`;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString();
  };

  const getTransactionIcon = (transaction: CreditTransaction) => {
    if (transaction.type === 'CREDIT') {
      return transaction.reference_type === 'CREDIT_ALLOCATION' ? 'bank-plus' : 'plus-circle';
    }
    return 'minus-circle';
  };

  const getTransactionColor = (type: string) => {
    return type === 'CREDIT' ? colors.success : colors.warning;
  };

  const getTransactionDescription = (transaction: CreditTransaction) => {
    if (transaction.description) return transaction.description;
    
    switch (transaction.reference_type) {
      case 'BOOKING':
        return 'Booking payment';
      case 'CREDIT_ALLOCATION':
        return 'Credit allocation';
      case 'CREDIT_ADJUSTMENT':
        return 'Credit adjustment';
      case 'PAYMENT':
        return 'Payment received';
      default:
        return transaction.type === 'CREDIT' ? 'Credit added' : 'Credit used';
    }
  };

  const renderOwnerFilter = () => {
    if (connections.length === 0) return null;

    const filterOptions = [
      { value: 'all', label: 'All Owners' },
      ...connections.map(connection => ({
        value: connection.owner_id,
        label: connection.owner.brand_name || connection.owner.business_name || 'Unknown Owner',
      })),
    ];

    return (
      <Surface style={styles.filterContainer} elevation={1}>
        <Text variant="titleSmall" style={styles.filterTitle}>
          Filter by Owner
        </Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterOptions}
        >
          {filterOptions.map((option) => (
            <Chip
              key={option.value}
              mode={selectedOwner === option.value ? 'flat' : 'outlined'}
              selected={selectedOwner === option.value}
              onPress={() => setSelectedOwner(option.value)}
              style={styles.filterChip}
            >
              {option.label}
            </Chip>
          ))}
        </ScrollView>
      </Surface>
    );
  };

  const renderSummaryCard = () => (
    <Surface style={styles.summaryContainer} elevation={1}>
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Credit Summary
      </Text>

      <View style={styles.summaryGrid}>
        <View style={styles.summaryItem}>
          <MaterialCommunityIcons name="trending-up" size={24} color={colors.success} />
          <Text variant="bodySmall" style={styles.summaryLabel}>Total Credits</Text>
          <Text variant="titleMedium" style={[styles.summaryValue, { color: colors.success }]}>
            {formatCurrency(summary.totalCredits)}
          </Text>
        </View>

        <View style={styles.summaryItem}>
          <MaterialCommunityIcons name="trending-down" size={24} color={colors.warning} />
          <Text variant="bodySmall" style={styles.summaryLabel}>Total Debits</Text>
          <Text variant="titleMedium" style={[styles.summaryValue, { color: colors.warning }]}>
            {formatCurrency(summary.totalDebits)}
          </Text>
        </View>

        <View style={styles.summaryItem}>
          <MaterialCommunityIcons name="wallet" size={24} color={theme.colors.primary} />
          <Text variant="bodySmall" style={styles.summaryLabel}>Current Balance</Text>
          <Text variant="titleMedium" style={[styles.summaryValue, { color: theme.colors.primary }]}>
            {formatCurrency(summary.currentBalance)}
          </Text>
        </View>

        <View style={styles.summaryItem}>
          <MaterialCommunityIcons name="format-list-numbered" size={24} color={theme.colors.onSurfaceVariant} />
          <Text variant="bodySmall" style={styles.summaryLabel}>Transactions</Text>
          <Text variant="titleMedium" style={styles.summaryValue}>
            {summary.transactionCount}
          </Text>
        </View>
      </View>
    </Surface>
  );

  const renderTransaction = (transaction: CreditTransaction) => (
    <Card key={transaction.id} style={styles.transactionCard}>
      <Card.Content style={styles.transactionContent}>
        <View style={styles.transactionHeader}>
          <View style={styles.transactionIcon}>
            <MaterialCommunityIcons
              name={getTransactionIcon(transaction)}
              size={24}
              color={getTransactionColor(transaction.type)}
            />
          </View>
          
          <View style={styles.transactionInfo}>
            <Text variant="titleSmall" style={styles.transactionDescription}>
              {getTransactionDescription(transaction)}
            </Text>
            <Text variant="bodySmall" style={styles.transactionMeta}>
              {transaction.owner?.brand_name || transaction.owner?.business_name || 'Unknown Owner'} • {formatDate(transaction.created_at)}
            </Text>
          </View>

          <View style={styles.transactionAmount}>
            <Text 
              variant="titleMedium" 
              style={[
                styles.amountText,
                { color: getTransactionColor(transaction.type) }
              ]}
            >
              {transaction.type === 'CREDIT' ? '+' : '-'}{formatCurrency(transaction.amount)}
            </Text>
            <Text variant="bodySmall" style={styles.balanceAfter}>
              Balance: {formatCurrency(transaction.balance_after)}
            </Text>
          </View>
        </View>

        {transaction.reference_id && (
          <View style={styles.transactionFooter}>
            <Text variant="bodySmall" style={styles.referenceId}>
              Ref: {transaction.reference_id.slice(-8).toUpperCase()}
            </Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons
        name="history"
        size={64}
        color={theme.colors.onSurfaceVariant}
      />
      <Text variant="headlineSmall" style={styles.emptyTitle}>
        No transactions yet
      </Text>
      <Text variant="bodyMedium" style={styles.emptySubtitle}>
        Your credit transactions will appear here once you start making bookings
      </Text>
    </View>
  );

  const renderTransactionsList = () => {
    if (transactions.length === 0) {
      return renderEmptyState();
    }

    // Group transactions by date
    const groupedTransactions = transactions.reduce((groups, transaction) => {
      const date = new Date(transaction.created_at).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(transaction);
      return groups;
    }, {} as Record<string, CreditTransaction[]>);

    return (
      <View style={styles.transactionsList}>
        {Object.entries(groupedTransactions).map(([date, dayTransactions]) => (
          <View key={date} style={styles.transactionGroup}>
            <Text variant="titleSmall" style={styles.dateHeader}>
              {formatDate(dayTransactions[0].created_at)}
            </Text>
            {dayTransactions.map(renderTransaction)}
          </View>
        ))}
      </View>
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
        {renderOwnerFilter()}
        {renderSummaryCard()}

        {loading ? (
          <View style={styles.loadingContainer}>
            <Text variant="bodyMedium">Loading transactions...</Text>
          </View>
        ) : (
          renderTransactionsList()
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
  filterContainer: {
    margin: spacing.md,
    borderRadius: 12,
    padding: spacing.md,
  },
  filterTitle: {
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  filterOptions: {
    gap: spacing.sm,
  },
  filterChip: {
    marginRight: spacing.xs,
  },
  summaryContainer: {
    margin: spacing.md,
    marginTop: 0,
    borderRadius: 12,
    padding: spacing.md,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  summaryItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 8,
    padding: spacing.md,
  },
  summaryLabel: {
    opacity: 0.7,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  summaryValue: {
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  transactionsList: {
    paddingHorizontal: spacing.md,
  },
  transactionGroup: {
    marginBottom: spacing.lg,
  },
  dateHeader: {
    fontWeight: '600',
    marginBottom: spacing.sm,
    color: theme.colors.primary,
  },
  transactionCard: {
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  transactionContent: {
    paddingVertical: spacing.sm,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginBottom: spacing.xs,
  },
  balanceAfter: {
    opacity: 0.7,
  },
  transactionFooter: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
  },
  referenceId: {
    opacity: 0.7,
    fontFamily: 'monospace',
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
  bottomSpacing: {
    height: 80,
  },
});
