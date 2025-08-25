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
    Surface,
    Text
} from '../compat/paper';
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
  ];

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [earningsData, summaryData, ledgerData] = await Promise.all([
        accountingService.getOwnerEarnings(user.id, selectedPeriod),
        accountingService.getFinancialSummary(user.id, selectedPeriod),
        accountingService.getLedgerEntries(user.id, selectedPeriod),
      ]);
      setEarnings(earningsData);
      setSummary(summaryData);
      setLedgerEntries(ledgerData);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch financial data.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [user.id, selectedPeriod]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading financial data...</Text>
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={styles.loadingContainer}>
        <Text>No financial data available for this period.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <Surface style={styles.surface}>
        <Text variant="headlineMedium" style={styles.title}>
          Financial Summary
        </Text>
        <View style={styles.summaryContainer}>
          <View style={styles.summaryItem}>
            <Text variant="titleMedium">Total Earnings</Text>
            <Text variant="headlineMedium">{summary.totalEarnings.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text variant="titleMedium">Total Expenses</Text>
            <Text variant="headlineMedium">{summary.totalExpenses.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text variant="titleMedium">Net Profit</Text>
            <Text variant="headlineMedium">{summary.netProfit.toFixed(2)}</Text>
          </View>
        </View>

        <Text variant="headlineMedium" style={styles.title}>
          Ledger Entries
        </Text>
        {ledgerEntries.length === 0 ? (
          <Text>No ledger entries for this period.</Text>
        ) : (
          <ScrollView>
            {ledgerEntries.map((entry) => (
              <Surface key={entry.id} style={styles.ledgerItem}>
                <View style={styles.ledgerHeader}>
                  <Text variant="titleMedium">{entry.description}</Text>
                  <Text variant="titleMedium">{entry.date}</Text>
                </View>
                <View style={styles.ledgerDetails}>
                  <Text variant="titleMedium">Amount: {entry.amount.toFixed(2)}</Text>
                  <Text variant="titleMedium">Type: {entry.type}</Text>
                  <Text variant="titleMedium">Category: {entry.category}</Text>
                </View>
              </Surface>
            ))}
          </ScrollView>
        )}
      </Surface>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: spacing.medium,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  surface: {
    padding: spacing.medium,
    borderRadius: spacing.small,
    elevation: 2,
    backgroundColor: colors.surface,
  },
  title: {
    marginBottom: spacing.medium,
    textAlign: 'center',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.medium,
  },
  summaryItem: {
    alignItems: 'center',
  },
  ledgerItem: {
    padding: spacing.medium,
    marginBottom: spacing.small,
    borderRadius: spacing.small,
    backgroundColor: colors.surfaceVariant,
  },
  ledgerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.small,
  },
  ledgerDetails: {
    marginTop: spacing.small,
  },
});