import React, { useState, useEffect } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Switch,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { apiService } from '../services/apiService';
import { AgentOwnerLink } from '../types';

export default function AgentManagementScreen({ navigation }: { navigation: any }) {
  const [connections, setConnections] = useState<AgentOwnerLink[]>([]);
  const [pendingRequests, setPendingRequests] = useState<AgentOwnerLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingConnection, setEditingConnection] = useState<AgentOwnerLink | null>(null);
  const [editForm, setEditForm] = useState({
    credit_limit: '',
    payment_terms_days: '',
    payment_methods_allowed: [] as string[],
    active: true,
  });

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      setIsLoading(true);
      
      const [connectionsResponse, requestsResponse] = await Promise.all([
        apiService.getOwnerAgentConnections(),
        apiService.getPendingAgentRequests()
      ]);
      
      if (connectionsResponse.success) {
        const allConnections = connectionsResponse.data || [];
        setConnections(allConnections.filter((c: AgentOwnerLink) => c.status === 'APPROVED'));
        setPendingRequests(allConnections.filter((c: AgentOwnerLink) => c.status === 'REQUESTED'));
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load connections');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestAction = async (requestId: number, action: 'APPROVE' | 'REJECT') => {
    try {
      const response = await apiService.respondToAgentRequest(requestId, action);
      
      if (response.success) {
        Alert.alert(
          'Success',
          `Connection request ${action.toLowerCase()}d successfully`,
          [
            {
              text: 'OK',
              onPress: () => loadConnections(),
            },
          ]
        );
      } else {
        Alert.alert('Error', response.error || `Failed to ${action.toLowerCase()} request`);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || `Failed to ${action.toLowerCase()} request`);
    }
  };

  const handleEditConnection = (connection: AgentOwnerLink) => {
    setEditingConnection(connection);
    setEditForm({
      credit_limit: connection.credit_limit.toString(),
      payment_terms_days: connection.payment_terms_days.toString(),
      payment_methods_allowed: connection.payment_methods_allowed,
      active: connection.active,
    });
    setShowEditModal(true);
  };

  const handleUpdateConnection = async () => {
    if (!editingConnection) return;

    try {
      const updateData = {
        credit_limit: parseFloat(editForm.credit_limit),
        payment_terms_days: parseInt(editForm.payment_terms_days),
        payment_methods_allowed: editForm.payment_methods_allowed,
        active: editForm.active,
      };

      const response = await apiService.updateAgentConnection(editingConnection.id, updateData);
      
      if (response.success) {
        Alert.alert('Success', 'Connection updated successfully');
        setShowEditModal(false);
        loadConnections();
      } else {
        Alert.alert('Error', response.error || 'Failed to update connection');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update connection');
    }
  };

  const handleBlockConnection = async (connectionId: number) => {
    Alert.alert(
      'Block Agent',
      'Are you sure you want to block this agent? They will not be able to make new bookings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiService.blockAgentConnection(connectionId);
              if (response.success) {
                Alert.alert('Success', 'Agent has been blocked');
                loadConnections();
              } else {
                Alert.alert('Error', response.error || 'Failed to block agent');
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to block agent');
            }
          },
        },
      ]
    );
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

  const getStatusColor = (status: string, active: boolean) => {
    if (!active) return '#6B7280';
    switch (status) {
      case 'APPROVED':
        return '#10B981';
      case 'REQUESTED':
        return '#F59E0B';
      case 'REJECTED':
        return '#EF4444';
      case 'BLOCKED':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const renderPendingRequest = ({ item }: { item: AgentOwnerLink }) => (
    <View style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={styles.agentInfo}>
          <Text style={styles.agentName}>{item.agent.display_name || item.agent.name}</Text>
          <Text style={styles.agentContact}>{item.agent.phone}</Text>
          <Text style={styles.requestDate}>Requested: {formatDate(item.created_at)}</Text>
        </View>
        <View style={styles.requestBadge}>
          <Text style={styles.requestBadgeText}>PENDING</Text>
        </View>
      </View>

      <View style={styles.requestDetails}>
        <View style={styles.requestDetailRow}>
          <Text style={styles.requestLabel}>Requested Credit:</Text>
          <Text style={styles.requestValue}>
            {formatCurrency(item.credit_limit, item.credit_currency)}
          </Text>
        </View>
        <View style={styles.requestDetailRow}>
          <Text style={styles.requestLabel}>Payment Terms:</Text>
          <Text style={styles.requestValue}>Net {item.payment_terms_days} days</Text>
        </View>
      </View>

      <View style={styles.requestActions}>
        <TouchableOpacity
          style={styles.approveButton}
          onPress={() => handleRequestAction(item.id, 'APPROVE')}
        >
          <FontAwesome5 name="check" size={14} color="#FFF" />
          <Text style={styles.approveButtonText}>Approve</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.rejectButton}
          onPress={() => handleRequestAction(item.id, 'REJECT')}
        >
          <FontAwesome5 name="times" size={14} color="#FFF" />
          <Text style={styles.rejectButtonText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderConnection = ({ item }: { item: AgentOwnerLink }) => (
    <View style={styles.connectionCard}>
      <View style={styles.connectionHeader}>
        <View style={styles.agentInfo}>
          <Text style={styles.agentName}>{item.agent.display_name || item.agent.name}</Text>
          <Text style={styles.agentContact}>{item.agent.phone}</Text>
          <Text style={styles.connectionDate}>Connected: {formatDate(item.created_at)}</Text>
        </View>
        <View style={styles.connectionStatus}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status, item.active) }
          ]}>
            <Text style={styles.statusText}>
              {item.active ? 'ACTIVE' : 'INACTIVE'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.connectionDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Credit Limit:</Text>
          <Text style={styles.detailValue}>
            {formatCurrency(item.credit_limit, item.credit_currency)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Payment Terms:</Text>
          <Text style={styles.detailValue}>Net {item.payment_terms_days} days</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Payment Methods:</Text>
          <Text style={styles.detailValue}>
            {item.payment_methods_allowed.join(', ') || 'All methods'}
          </Text>
        </View>
      </View>

      <View style={styles.connectionActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleEditConnection(item)}
        >
          <FontAwesome5 name="edit" size={14} color="#007AFF" />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.viewLedgerButton}
          onPress={() => navigation.navigate('AgentLedger', { agentId: item.agent_id })}
        >
          <FontAwesome5 name="book" size={14} color="#10B981" />
          <Text style={styles.viewLedgerButtonText}>Ledger</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.blockButton}
          onPress={() => handleBlockConnection(item.id)}
        >
          <FontAwesome5 name="ban" size={14} color="#EF4444" />
          <Text style={styles.blockButtonText}>Block</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <FontAwesome5 name="spinner" size={24} color="#007AFF" />
          <Text style={styles.loadingText}>Loading agent connections...</Text>
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
          <Text style={styles.headerTitle}>Agent Management</Text>
          <Text style={styles.headerSubtitle}>Manage agent connections and requests</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pending Requests</Text>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>{pendingRequests.length}</Text>
              </View>
            </View>
            
            <FlatList
              data={pendingRequests}
              renderItem={renderPendingRequest}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Active Connections */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Connected Agents ({connections.length})
          </Text>
          
          {connections.length > 0 ? (
            <FlatList
              data={connections}
              renderItem={renderConnection}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <FontAwesome5 name="user-tie" size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No Connected Agents</Text>
              <Text style={styles.emptyDescription}>
                You don't have any connected agents yet. Agents can request connections to book on credit.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Edit Connection Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditModal(false)}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowEditModal(false)}
            >
              <FontAwesome5 name="times" size={20} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Agent Connection</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.modalContent}>
            {editingConnection && (
              <>
                <View style={styles.agentSummary}>
                  <FontAwesome5 name="user-tie" size={32} color="#007AFF" />
                  <Text style={styles.agentSummaryName}>
                    {editingConnection.agent.display_name || editingConnection.agent.name}
                  </Text>
                  <Text style={styles.agentSummaryContact}>
                    {editingConnection.agent.phone}
                  </Text>
                </View>

                <View style={styles.editForm}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Credit Limit *</Text>
                    <View style={styles.inputContainer}>
                      <FontAwesome5 name="credit-card" size={16} color="#6B7280" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="0.00"
                        value={editForm.credit_limit}
                        onChangeText={(value) => setEditForm(prev => ({ ...prev, credit_limit: value }))}
                        keyboardType="numeric"
                      />
                      <Text style={styles.currencyText}>{editingConnection.credit_currency}</Text>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Payment Terms (Days) *</Text>
                    <View style={styles.inputContainer}>
                      <FontAwesome5 name="calendar" size={16} color="#6B7280" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="7"
                        value={editForm.payment_terms_days}
                        onChangeText={(value) => setEditForm(prev => ({ ...prev, payment_terms_days: value }))}
                        keyboardType="numeric"
                      />
                      <Text style={styles.currencyText}>days</Text>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Payment Methods Allowed</Text>
                    <View style={styles.paymentMethodsGrid}>
                      {['CASH', 'BANK_TRANSFER', 'CARD', 'MOBILE'].map(method => (
                        <TouchableOpacity
                          key={method}
                          style={[
                            styles.paymentMethodChip,
                            editForm.payment_methods_allowed.includes(method) && styles.selectedPaymentMethodChip
                          ]}
                          onPress={() => {
                            setEditForm(prev => ({
                              ...prev,
                              payment_methods_allowed: prev.payment_methods_allowed.includes(method)
                                ? prev.payment_methods_allowed.filter(m => m !== method)
                                : [...prev.payment_methods_allowed, method]
                            }));
                          }}
                        >
                          <Text style={[
                            styles.paymentMethodChipText,
                            editForm.payment_methods_allowed.includes(method) && styles.selectedPaymentMethodChipText
                          ]}>
                            {method.replace('_', ' ')}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Active Connection</Text>
                    <Switch
                      value={editForm.active}
                      onValueChange={(value) => setEditForm(prev => ({ ...prev, active: value }))}
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.updateButton}
                    onPress={handleUpdateConnection}
                  >
                    <FontAwesome5 name="save" size={16} color="#FFF" />
                    <Text style={styles.updateButtonText}>Update Connection</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
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

  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginRight: 8,
  },
  pendingBadge: {
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pendingBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },

  requestCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  agentInfo: {
    flex: 1,
  },
  agentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  agentContact: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  requestDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  requestBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  requestBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFF',
  },

  requestDetails: {
    gap: 6,
    marginBottom: 16,
  },
  requestDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  requestLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  requestValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },

  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  approveButton: {
    flex: 1,
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  approveButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  rejectButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },

  connectionCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  connectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  connectionDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  connectionStatus: {
    marginLeft: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFF',
  },

  connectionDetails: {
    gap: 6,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },

  connectionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  editButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  viewLedgerButton: {
    flex: 1,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  viewLedgerButtonText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
  },
  blockButton: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  blockButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },

  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
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
  },

  agentSummary: {
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  agentSummaryName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
    marginBottom: 4,
  },
  agentSummaryContact: {
    fontSize: 14,
    color: '#6B7280',
  },

  editForm: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#111827',
  },
  currencyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 8,
  },

  paymentMethodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paymentMethodChip: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  selectedPaymentMethodChip: {
    backgroundColor: '#F0F9FF',
    borderColor: '#007AFF',
  },
  paymentMethodChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  selectedPaymentMethodChipText: {
    color: '#007AFF',
  },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },

  updateButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  updateButtonText: {
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