import React, { useState, useEffect } from 'react';
import {
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { apiService } from '../services/apiService';
import { LedgerEntry, PaymentReceipt } from '../types';

interface OwnerAccountSummary {
  total_revenue: number;
  agent_receivables: number;
  public_sales: number;
  app_fees_owed: number;
  app_fees_paid: number;
  currency: string;
  last_settlement_date?: string;
  next_settlement_due?: string;
}

interface AccountEntry {
  id: number;
  date: string;
  type: 'BOOKING' | 'PAYMENT' | 'APP_FEE' | 'SETTLEMENT' | 'ADJUSTMENT';
  description: string;
  counterparty: string;
  booking_code?: string;
  debit: number;
  credit: number;
  balance: number;
  status: 'CONFIRMED' | 'PENDING' | 'DISPUTED';
}

export default function OwnerAccountBookScreen({ navigation }: { navigation: any }) {
  const [summary, setSummary] = useState<OwnerAccountSummary>({
    total_revenue: 0,
    agent_receivables: 0,
    public_sales: 0,
    app_fees_owed: 0,
    app_fees_paid: 0,
    currency: 'MVR',
  });
  const [entries, setEntries] = useState<AccountEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<AccountEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<'ALL' | 'AGENT' | 'PUBLIC' | 'APP_FEE'>('ALL');
  const [filterPeriod, setFilterPeriod] = useState<'30D' | '90D' | '1Y' | 'ALL'>('30D');
  const [showAppFeeModal, setShowAppFeeModal] = useState(false);

  useEffect(() => {
    loadAccountBook();
  }, []);

  useEffect(() => {
    filterEntries();
  }, [entries, filterType, filterPeriod]);

  const loadAccountBook = async () => {
    try {
      setIsLoading(true);
      
      const [summaryResponse, entriesResponse] = await Promise.all([
        apiService.getOwnerAccountSummary(),
        apiService.getOwnerAccountEntries()
      ]);
      
      if (summaryResponse.success) {
        setSummary(summaryResponse.data);
      }
      
      if (entriesResponse.success) {
        setEntries(entriesResponse.data || []);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load account book');
    } finally {
      setIsLoading(false);
    }
  };

  const filterEntries = () => {
    let filtered = entries;

    // Filter by type
    if (filterType !== 'ALL') {
      filtered = filtered.filter(entry => {
        switch (filterType) {
          case 'AGENT':
            return entry.type === 'BOOKING' && entry.counterparty.includes('Agent');
          case 'PUBLIC':
            return entry.type === 'BOOKING' && entry.counterparty.includes('Public');
          case 'APP_FEE':
            return entry.type === 'APP_FEE';
          default:
            return true;
        }
      });
    }

    // Filter by period
    if (filterPeriod !== 'ALL') {
      const now = new Date();
      const cutoffDate = new Date();
      
      switch (filterPeriod) {
        case '30D':
          cutoffDate.setDate(now.getDate() - 30);
          break;
        case '90D':
          cutoffDate.setDate(now.getDate() - 90);
          break;
        case '1Y':
          cutoffDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      filtered = filtered.filter(entry => new Date(entry.date) >= cutoffDate);
    }

    setFilteredEntries(filtered);
  };

  const handleAppFeeSettlement = async () => {
    try {
      const response = await apiService.initiateAppFeeSettlement();
      
      if (response.success) {
        Alert.alert(
          'Settlement Initiated',
          'App fee settlement has been initiated. You will receive payment instructions shortly.',
          [
            {
              text: 'OK',
              onPress: () => {
                setShowAppFeeModal(false);
                loadAccountBook(); // Refresh data
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', response.error || 'Failed to initiate settlement');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to initiate settlement');
    }
  };

  const exportAccountBook = async (format: 'CSV' | 'PDF') => {
    try {
      const response = await apiService.exportOwnerAccountBook(format, {
        type: filterType,
        period: filterPeriod,
      });
      
      if (response.success) {
        Alert.alert('Success', `Account book exported as ${format}. Check your downloads.`);
      } else {
        Alert.alert('Error', response.error || 'Failed to export account book');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to export account book');
    }
  };

  const formatCurrency = (amount: number, currency: string = 'MVR') => {
    return `${currency} ${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getEntryTypeColor = (type: string) => {
    switch (type) {
      case 'BOOKING':
        return '#3B82F6';
      case 'PAYMENT':
        return '#10B981';
      case 'APP_FEE':
        return '#F59E0B';
      case 'SETTLEMENT':
        return '#8B5CF6';
      case 'ADJUSTMENT':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const getEntryTypeIcon = (type: string) => {
    switch (type) {
      case 'BOOKING':
        return 'ticket-alt';
      case 'PAYMENT':
        return 'money-bill';
      case 'APP_FEE':
        return 'percentage';
      case 'SETTLEMENT':
        return 'handshake';
      case 'ADJUSTMENT':
        return 'edit';
      default:
        return 'circle';
    }
  };

  const renderAccountEntry = ({ item }: { item: AccountEntry }) => (
    <View style={styles.entryCard}>
      <View style={styles.entryHeader}>
        <View style={styles.entryInfo}>
          <View style={styles.entryTitleRow}>
            <View style={[
              styles.entryTypeIcon,
              { backgroundColor: getEntryTypeColor(item.type) }
            ]}>
              <FontAwesome5 
                name={getEntryTypeIcon(item.type)} 
                size={12} 
                color="#FFF" 
              />
            </View>
            <Text style={styles.entryDescription}>{item.description}</Text>
          </View>
          <Text style={styles.entryCounterparty}>{item.counterparty}</Text>
          {item.booking_code && (
            <Text style={styles.bookingCode}>Booking: {item.booking_code}</Text>
          )}
          <Text style={styles.entryDate}>{formatDate(item.date)}</Text>
        </View>
        <View style={styles.entryAmounts}>
          {item.debit > 0 && (
            <Text style={styles.debitAmount}>
              -{formatCurrency(item.debit, summary.currency)}
            </Text>
          )}
          {item.credit > 0 && (
            <Text style={styles.creditAmount}>
              +{formatCurrency(item.credit, summary.currency)}
            </Text>
          )}
          <Text style={styles.balanceAmount}>
            Bal: {formatCurrency(item.balance, summary.currency)}
          </Text>
        </View>
      </View>
      
      <View style={styles.entryStatus}>
        <View style={[
          styles.statusIndicator,
          { backgroundColor: item.status === 'CONFIRMED' ? '#10B981' : 
                            item.status === 'PENDING' ? '#F59E0B' : '#EF4444' }
        ]} />
        <Text style={styles.entryStatusText}>{item.status}</Text>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <FontAwesome5 name="spinner" size={24} color="#007AFF" />
          <Text style={styles.loadingText}>Loading account book...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <FontAwesome5 name="arrow-left" size={20} color="#007AFF" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Account Book</Text>
          <Text style={styles.headerSubtitle}>Financial overview and transactions</Text>
        </View>
        <TouchableOpacity
          style={styles.exportButton}
          onPress={() => {
            Alert.alert(
              'Export Account Book',
              'Choose export format',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'CSV', onPress: () => exportAccountBook('CSV') },
                { text: 'PDF', onPress: () => exportAccountBook('PDF') },
              ]
            );
          }}
        >
          <FontAwesome5 name="download" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Account Summary */}
      <View style={styles.summarySection}>
        <Text style={styles.sectionTitle}>Financial Overview</Text>
        
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <FontAwesome5 name="chart-line" size={20} color="#10B981" />
            <Text style={styles.summaryLabel}>Total Revenue</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(summary.total_revenue, summary.currency)}
            </Text>
          </View>
          
          <View style={styles.summaryCard}>
            <FontAwesome5 name="user-tie" size={20} color="#3B82F6" />
            <Text style={styles.summaryLabel}>Agent Receivables</Text>
            <Text style={[styles.summaryValue, { color: '#3B82F6' }]}>
              {formatCurrency(summary.agent_receivables, summary.currency)}
            </Text>
          </View>
          
          <View style={styles.summaryCard}>
            <FontAwesome5 name="users" size={20} color="#10B981" />
            <Text style={styles.summaryLabel}>Public Sales</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(summary.public_sales, summary.currency)}
            </Text>
          </View>
          
          <TouchableOpacity
            style={[styles.summaryCard, styles.appFeeCard]}
            onPress={() => setShowAppFeeModal(true)}
          >
            <FontAwesome5 name="percentage" size={20} color="#F59E0B" />
            <Text style={styles.summaryLabel}>App Fees Owed</Text>
            <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>
              {formatCurrency(summary.app_fees_owed, summary.currency)}
            </Text>
            <FontAwesome5 name="chevron-right" size={12} color="#F59E0B" style={styles.cardArrow} />
          </TouchableOpacity>
        </View>

        {summary.next_settlement_due && (
          <View style={styles.settlementAlert}>
            <FontAwesome5 name="calendar-exclamation" size={16} color="#F59E0B" />
            <Text style={styles.settlementText}>
              Next app fee settlement due: {formatDate(summary.next_settlement_due)}
            </Text>
          </View>
        )}
      </View>

      {/* Filters */}
      <View style={styles.filtersSection}>
        <View style={styles.filterGroup}>
          <Text style={styles.filterTitle}>Type</Text>
          <View style={styles.filterTabs}>
            {['ALL', 'AGENT', 'PUBLIC', 'APP_FEE'].map(type => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.filterTab,
                  filterType === type && styles.activeFilterTab
                ]}
                onPress={() => setFilterType(type as any)}
              >
                <Text style={[
                  styles.filterTabText,
                  filterType === type && styles.activeFilterTabText
                ]}>
                  {type.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.filterGroup}>
          <Text style={styles.filterTitle}>Period</Text>
          <View style={styles.filterTabs}>
            {['30D', '90D', '1Y', 'ALL'].map(period => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.filterTab,
                  filterPeriod === period && styles.activeFilterTab
                ]}
                onPress={() => setFilterPeriod(period as any)}
              >
                <Text style={[
                  styles.filterTabText,
                  filterPeriod === period && styles.activeFilterTabText
                ]}>
                  {period}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Account Entries */}
      <View style={styles.entriesSection}>
        <Text style={styles.entriesTitle}>
          Transaction History ({filteredEntries.length})
        </Text>
        
        {filteredEntries.length > 0 ? (
          <FlatList
            data={filteredEntries}
            renderItem={renderAccountEntry}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.entriesList}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.noEntriesState}>
            <FontAwesome5 name="receipt" size={32} color="#9CA3AF" />
            <Text style={styles.noEntriesText}>No transactions found</Text>
            <Text style={styles.noEntriesSubtext}>
              Try adjusting your filters or check back later
            </Text>
          </View>
        )}
      </View>

      {/* App Fee Settlement Modal */}
      <Modal
        visible={showAppFeeModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAppFeeModal(false)}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowAppFeeModal(false)}
            >
              <FontAwesome5 name="times" size={20} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>App Fee Settlement</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.modalContent}>
            <View style={styles.feeBreakdown}>
              <FontAwesome5 name="percentage" size={48} color="#F59E0B" />
              <Text style={styles.feeTitle}>Platform Fees</Text>
              
              <View style={styles.feeDetails}>
                <View style={styles.feeRow}>
                  <Text style={styles.feeLabel}>Total Accrued:</Text>
                  <Text style={styles.feeValue}>
                    {formatCurrency(summary.app_fees_owed + summary.app_fees_paid, summary.currency)}
                  </Text>
                </View>
                <View style={styles.feeRow}>
                  <Text style={styles.feeLabel}>Paid:</Text>
                  <Text style={[styles.feeValue, { color: '#10B981' }]}>
                    {formatCurrency(summary.app_fees_paid, summary.currency)}
                  </Text>
                </View>
                <View style={[styles.feeRow, styles.totalFeeRow]}>
                  <Text style={styles.feeTotalLabel}>Outstanding:</Text>
                  <Text style={styles.feeTotalValue}>
                    {formatCurrency(summary.app_fees_owed, summary.currency)}
                  </Text>
                </View>
              </View>

              {summary.app_fees_owed > 0 && (
                <>
                  <View style={styles.settlementInfo}>
                    <FontAwesome5 name="info-circle" size={16} color="#007AFF" />
                    <Text style={styles.settlementInfoText}>
                      Upload your payment receipt to settle outstanding app fees
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.settlementButton}
                    onPress={() => {
                      setShowAppFeeModal(false);
                      navigation.navigate('UploadPaymentSlip', { 
                        ownerId: 'app_owner',
                        amount: summary.app_fees_owed,
                        currency: summary.currency,
                        type: 'APP_FEE_SETTLEMENT'
                      });
                    }}
                  >
                    <FontAwesome5 name="upload" size={16} color="#FFF" />
                    <Text style={styles.settlementButtonText}>Upload Payment Receipt</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FA' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  exportButton: {
    padding: 8,
  },

  summarySection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '48%',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    position: 'relative',
  },
  appFeeCard: {
    borderWidth: 2,
    borderColor: '#FEF3C7',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  cardArrow: {
    position: 'absolute',
    top: 12,
    right: 12,
  },

  settlementAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    gap: 8,
  },
  settlementText: {
    fontSize: 14,
    color: '#92400E',
    fontWeight: '500',
  },

  filtersSection: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  filterGroup: {
    marginBottom: 16,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeFilterTab: {
    backgroundColor: '#007AFF',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeFilterTabText: {
    color: '#FFF',
  },

  entriesSection: {
    flex: 1,
    marginHorizontal: 16,
  },
  entriesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  entriesList: {
    gap: 8,
    paddingBottom: 20,
  },

  entryCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  entryInfo: {
    flex: 1,
  },
  entryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  entryTypeIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  entryDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  entryCounterparty: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  bookingCode: {
    fontSize: 12,
    color: '#007AFF',
    marginBottom: 2,
  },
  entryDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  entryAmounts: {
    alignItems: 'flex-end',
  },
  debitAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
    marginBottom: 2,
  },
  creditAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 2,
  },
  balanceAmount: {
    fontSize: 12,
    color: '#6B7280',
  },
  entryStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  entryStatusText: {
    fontSize: 12,
    color: '#6B7280',
  },

  noEntriesState: {
    alignItems: 'center',
    padding: 32,
  },
  noEntriesText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 8,
  },
  noEntriesSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },

  // Modal Styles
  modalSafe: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalCloseButton: {
    padding: 8,
  },
  placeholder: { width: 36 },
  modalContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  feeBreakdown: {
    alignItems: 'center',
    width: '100%',
  },
  feeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 24,
  },
  feeDetails: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  feeLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  feeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  totalFeeRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
    marginTop: 8,
  },
  feeTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  feeTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F59E0B',
  },

  settlementInfo: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    gap: 8,
    width: '100%',
  },
  settlementInfoText: {
    fontSize: 14,
    color: '#1E40AF',
    flex: 1,
  },

  settlementButton: {
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settlementButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
});