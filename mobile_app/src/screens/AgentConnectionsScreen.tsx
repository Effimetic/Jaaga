import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { apiService } from '../services/apiService';

interface AgentConnection {
  id: number;
  agent: {
    id: number;
    name: string;
    phone: string;
  };
  currency: string;
  credit_limit: number;
  current_balance: number;
  status: string;
  created_at: string;
}

export default function AgentConnectionsScreen({ navigation }: { navigation: any }) {
  const [connections, setConnections] = useState<AgentConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newConnection, setNewConnection] = useState({
    agent_phone: '',
    credit_limit: '',
    currency: 'MVR'
  });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getAgentConnections();
      if (response.success) {
        setConnections(response.data || []);
      } else {
        Alert.alert('Error', response.error || 'Failed to load agent connections');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load agent connections');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateConnection = async () => {
    if (!newConnection.agent_phone.trim()) {
      Alert.alert('Error', 'Please enter agent phone number');
      return;
    }

    if (!newConnection.credit_limit || parseFloat(newConnection.credit_limit) < 0) {
      Alert.alert('Error', 'Please enter a valid credit limit');
      return;
    }

    setIsCreating(true);

    try {
      const connectionData = {
        agent_phone: newConnection.agent_phone.trim(),
        credit_limit: parseFloat(newConnection.credit_limit),
        currency: newConnection.currency
      };

      const response = await apiService.createAgentConnection(connectionData);
      
      if (response.success) {
        Alert.alert('Success', 'Agent connection created successfully');
        setShowAddModal(false);
        setNewConnection({ agent_phone: '', credit_limit: '', currency: 'MVR' });
        loadConnections(); // Reload the list
      } else {
        Alert.alert('Error', response.error || 'Failed to create agent connection');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create agent connection');
    } finally {
      setIsCreating(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return '#10B981';
      case 'pending':
        return '#F59E0B';
      case 'rejected':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const renderConnectionCard = ({ item }: { item: AgentConnection }) => (
    <View style={styles.connectionCard}>
      <View style={styles.connectionHeader}>
        <View style={styles.agentInfo}>
          <Text style={styles.agentName}>{item.agent.name}</Text>
          <Text style={styles.agentPhone}>{item.agent.phone}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: getStatusColor(item.status) }
        ]}>
          <Text style={styles.statusText}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>
      
      <View style={styles.connectionDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Credit Limit:</Text>
          <Text style={styles.detailValue}>
            {item.currency} {item.credit_limit.toFixed(2)}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Current Balance:</Text>
          <Text style={[
            styles.detailValue,
            { color: item.current_balance > 0 ? '#EF4444' : '#10B981' }
          ]}>
            {item.currency} {Math.abs(item.current_balance).toFixed(2)}
            {item.current_balance > 0 ? ' (Owed)' : ' (Credit)'}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Available:</Text>
          <Text style={styles.detailValue}>
            {item.currency} {(item.credit_limit - item.current_balance).toFixed(2)}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Connected:</Text>
          <Text style={styles.detailValue}>{formatDate(item.created_at)}</Text>
        </View>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <FontAwesome5 name="user-tie" size={48} color="#9CA3AF" />
      </View>
      <Text style={styles.emptyTitle}>No Agent Connections</Text>
      <Text style={styles.emptyDescription}>
        You haven't connected with any agents yet. Add agent connections to allow them to book on credit.
      </Text>
      <TouchableOpacity
        style={styles.emptyActionBtn}
        onPress={() => setShowAddModal(true)}
      >
        <FontAwesome5 name="plus" size={16} color="#FFF" />
        <Text style={styles.emptyActionText}>Add First Connection</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.pageHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <FontAwesome5 name="arrow-left" size={20} color="#007AFF" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.pageTitle}>Agent Connections</Text>
          <Text style={styles.pageSubtitle}>Manage your agent relationships</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <FontAwesome5 name="plus" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Stats Summary */}
      <View style={styles.statsSummary}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{connections.length}</Text>
          <Text style={styles.statLabel}>Total Agents</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {connections.filter(c => c.status === 'approved').length}
          </Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            MVR {connections.reduce((sum, c) => sum + c.current_balance, 0).toFixed(0)}
          </Text>
          <Text style={styles.statLabel}>Total Owed</Text>
        </View>
      </View>

      {/* Connections List */}
      {connections.length > 0 ? (
        <FlatList
          data={connections}
          renderItem={renderConnectionCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.connectionsList}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        renderEmptyState()
      )}

      {/* Add Connection Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowAddModal(false)}
            >
              <FontAwesome5 name="times" size={20} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Agent Connection</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Agent Phone Number *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="+960 123 4567"
                value={newConnection.agent_phone}
                onChangeText={(value) => setNewConnection(prev => ({ ...prev, agent_phone: value }))}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Credit Limit *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="0.00"
                value={newConnection.credit_limit}
                onChangeText={(value) => setNewConnection(prev => ({ ...prev, credit_limit: value }))}
                keyboardType="numeric"
              />
            </View>

            <TouchableOpacity
              style={[styles.createButton, isCreating && styles.disabledButton]}
              onPress={handleCreateConnection}
              disabled={isCreating}
            >
              {isCreating ? (
                <Text style={styles.createButtonText}>Creating...</Text>
              ) : (
                <>
                  <FontAwesome5 name="handshake" size={16} color="#FFF" />
                  <Text style={styles.createButtonText}>Create Connection</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FA' },

  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  statsSummary: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
  },

  connectionsList: {
    padding: 16,
    gap: 12,
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
  agentInfo: {
    flex: 1,
  },
  agentName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  agentPhone: {
    fontSize: 14,
    color: '#6B7280',
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
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
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

  // Modal styles
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
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  placeholder: { width: 36 },

  modalContent: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFF',
  },

  createButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  createButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});