import React, { useState, useEffect } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { apiService } from '../services/apiService';
import { LedgerEntry, PaymentReceipt, AgentOwnerLink } from '../types';
import * as DocumentPicker from 'expo-document-picker';

interface AccountBookEntry {
  id: number;
  date: string;
  description: string;
  booking_code?: string;
  debit: number;
  credit: number;
  balance: number;
  type: 'BOOKING' | 'PAYMENT' | 'FEE' | 'ADJUSTMENT';
  status: 'CONFIRMED' | 'PENDING' | 'DISPUTED';
}

interface OwnerAccount {
  owner_id: number;
  owner_name: string;
  owner_brand: string;
  currency: string;
  credit_limit: number;
  current_balance: number;
  available_credit: number;
  payment_terms_days: number;
  last_payment_date?: string;
  next_due_date?: string;
  entries: AccountBookEntry[];
}

export default function AgentAccountBookScreen({ navigation }: { navigation: any }) {
  const [ownerAccounts, setOwnerAccounts] = useState<OwnerAccount[]>([]);
  const [selectedOwner, setSelectedOwner] = useState<OwnerAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [filterPeriod, setFilterPeriod] = useState<'ALL' | '30D' | '90D' | '1Y'>('30D');

  useEffect(() => {
    loadAccountBook();
  }, []);

  const loadAccountBook = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getAgentAccountBook();
      
      if (response.success) {
        setOwnerAccounts(response.data || []);
        if (response.data.length > 0) {
          setSelectedOwner(response.data[0]);
        }
      } else {
        Alert.alert('Error', response.error || 'Failed to load account book');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load account book');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadPaymentSlip = async (ownerId: number) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        
        // Show payment slip upload modal
        navigation.navigate('UploadPaymentSlip', { 
          ownerId: ownerId,
          fileUri: file.uri,
          fileName: file.name,
          fileType: file.mimeType
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select file');
    }
  };

  const exportAccountBook = async (ownerId: number, format: 'CSV' | 'PDF') => {
    try {
      const response = await apiService.exportAgentAccountBook(ownerId, format);
      
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
      case 'FEE':
        return '#F59E0B';
      case 'ADJUSTMENT':
        return '#8B5CF6';
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
      case 'FEE':
        return 'percentage';
      case 'ADJUSTMENT':
        return 'edit';
      default:
        return 'circle';
    }
  };

  const renderOwnerTab = (owner: OwnerAccount) => (
    <TouchableOpacity
      key={owner.owner_id}
      style={[
        styles.ownerTab,
        selectedOwner?.owner_id === owner.owner_id && styles.activeOwnerTab
      ]}
      onPress={() => setSelectedOwner(owner)}
    >
      <Text style={[
        styles.ownerTabText,
        selectedOwner?.owner_id === owner.owner_id && styles.activeOwnerTabText
      ]}>
        {owner.owner_brand}
      </Text>
    </TouchableOpacity>
  );

  const renderAccountEntry = ({ item }: { item: AccountBookEntry }) => (
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
          {item.booking_code && (
            <Text style={styles.bookingCode}>Booking: {item.booking_code}</Text>
          )}
          <Text style={styles.entryDate}>{formatDate(item.date)}</Text>
        </View>
        <View style={styles.entryAmounts}>
          {item.debit > 0 && (
            <Text style={styles.debitAmount}>
              -{formatCurrency(item.debit, selectedOwner?.currency)}
            </Text>
          )}
          {item.credit > 0 && (
            <Text style={styles.creditAmount}>
              +{formatCurrency(item.credit, selectedOwner?.currency)}
            </Text>
          )}
          <Text style={styles.balanceAmount}>
            Bal: {formatCurrency(item.balance, selectedOwner?.currency)}
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

  if (ownerAccounts.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyState}>
          <FontAwesome5 name="book" size={48} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>No Account Data</Text>
          <Text style={styles.emptyDescription}>
            You don't have any approved connections with boat owners yet.
          </Text>
          <TouchableOpacity
            style={styles.emptyActionBtn}
            onPress={() => navigation.navigate('AgentConnections')}
          >
            <FontAwesome5 name="handshake" size={16} color="#FFF" />
            <Text style={styles.emptyActionText}>View Connections</Text>
          </TouchableOpacity>
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
          <Text style={styles.headerSubtitle}>Ledger vs each owner</Text>
        </View>
        <TouchableOpacity
          style={styles.exportButton}
          onPress={() => {
            if (selectedOwner) {
              Alert.alert(
                'Export Account Book',
                'Choose export format',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'CSV', onPress: () => exportAccountBook(selectedOwner.owner_id, 'CSV') },
                  { text: 'PDF', onPress: () => exportAccountBook(selectedOwner.owner_id, 'PDF') },
                ]
              );
            }
          }}
        >
          <FontAwesome5 name="download" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Owner Tabs */}
      <View style={styles.ownerTabs}>
        <FlatList
          data={ownerAccounts}
          renderItem={({ item }) => renderOwnerTab(item)}
          keyExtractor={(item) => item.owner_id.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.ownerTabsList}
        />
      </View>

      {selectedOwner && (
        <>
          {/* Account Summary */}
          <View style={styles.accountSummary}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>{selectedOwner.owner_brand}</Text>
              <View style={styles.summaryActions}>
                <TouchableOpacity
                  style={styles.paymentButton}
                  onPress={() => handleUploadPaymentSlip(selectedOwner.owner_id)}
                >
                  <FontAwesome5 name="upload" size={14} color="#FFF" />
                  <Text style={styles.paymentButtonText}>Upload Payment</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Credit Limit</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(selectedOwner.credit_limit, selectedOwner.currency)}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Current Balance</Text>
                <Text style={[
                  styles.summaryValue,
                  { color: selectedOwner.current_balance > 0 ? '#EF4444' : '#10B981' }
                ]}>
                  {formatCurrency(Math.abs(selectedOwner.current_balance), selectedOwner.currency)}
                  {selectedOwner.current_balance > 0 ? ' (Owed)' : ' (Credit)'}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Available Credit</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(selectedOwner.available_credit, selectedOwner.currency)}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Payment Terms</Text>
                <Text style={styles.summaryValue}>Net {selectedOwner.payment_terms_days} days</Text>
              </View>
            </View>

            {selectedOwner.next_due_date && (
              <View style={styles.dueDateAlert}>
                <FontAwesome5 name="calendar-exclamation" size={16} color="#F59E0B" />
                <Text style={styles.dueDateText}>
                  Next payment due: {formatDate(selectedOwner.next_due_date)}
                </Text>
              </View>
            )}
          </View>

          {/* Filter Period */}
          <View style={styles.filterSection}>
            <Text style={styles.filterTitle}>Period</Text>
            <View style={styles.filterTabs}>
              {['ALL', '30D', '90D', '1Y'].map(period => (
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

          {/* Account Entries */}
          <View style={styles.entriesSection}>
            <Text style={styles.entriesTitle}>Transaction History</Text>
            {selectedOwner.entries.length > 0 ? (
              <FlatList
                data={selectedOwner.entries}
                renderItem={renderAccountEntry}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.entriesList}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.noEntriesState}>
                <FontAwesome5 name="receipt" size={32} color="#9CA3AF" />
                <Text style={styles.noEntriesText}>No transactions yet</Text>
              </View>
            )}
          </View>
        </>
      )}

      {/* Payment Slip Upload Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowPaymentModal(false)}
            >
              <FontAwesome5 name="times" size={20} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Upload Payment Slip</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.modalContent}>
            <View style={styles.uploadSection}>
              <FontAwesome5 name="cloud-upload-alt" size={48} color="#007AFF" />
              <Text style={styles.uploadTitle}>Upload Payment Receipt</Text>
              <Text style={styles.uploadDescription}>
                Upload a photo or PDF of your payment receipt to {selectedOwner?.owner_brand}
              </Text>
              
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => handleUploadPaymentSlip(selectedOwner?.owner_id || 0)}
              >
                <FontAwesome5 name="camera" size={16} color="#FFF" />
                <Text style={styles.uploadButtonText}>Take Photo / Select File</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Receipt View Modal */}
      <Modal
        visible={showReceiptModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowReceiptModal(false)}
      >
        <View style={styles.receiptModalOverlay}>
          <View style={styles.receiptModalContent}>
            <TouchableOpacity
              style={styles.receiptCloseButton}
              onPress={() => setShowReceiptModal(false)}
            >
              <FontAwesome5 name="times" size={20} color="#FFF" />
            </TouchableOpacity>
            
            {selectedReceipt && (
              <Image
                source={{ uri: selectedReceipt }}
                style={styles.receiptImage}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
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

  ownerTabs: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  ownerTabsList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  ownerTab: {
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  activeOwnerTab: {
    backgroundColor: '#007AFF',
  },
  ownerTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeOwnerTabText: {
    color: '#FFF',
  },

  accountSummary: {
    backgroundColor: '#FFF',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  summaryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  paymentButton: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paymentButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },

  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },

  dueDateAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    gap: 8,
  },
  dueDateText: {
    fontSize: 14,
    color: '#92400E',
    fontWeight: '500',
  },

  filterSection: {
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
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
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
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  emptyActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
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

  uploadSection: {
    alignItems: 'center',
  },
  uploadTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  uploadDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  uploadButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  uploadButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },

  receiptModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptModalContent: {
    width: '90%',
    height: '80%',
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
  },
  receiptCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptImage: {
    width: '100%',
    height: '100%',
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