import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Switch,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { FontAwesome5 } from '@expo/vector-icons';
import { apiService } from '../services/apiService';

interface OwnerSettings {
  company_name: string;
  company_description: string;
  company_logo: string;
}

interface TicketType {
  id: number;
  name: string;
  code: string;
  base_price: number;
  currency: string;
  refundable: boolean;
  active: boolean;
}

interface TaxProfile {
  id: number;
  name: string;
  lines: Array<{
    name: string;
    type: string;
    value: number;
    applies_to: string;
    active: boolean;
  }>;
  rounding_rule: string;
  active: boolean;
}

interface PaymentMethods {
  cash: boolean;
  transfer: boolean;
  bml_gateway: boolean;
  other: boolean;
}

export default function OwnerSettingsScreen({ navigation }: { navigation: any }) {
  const [activeTab, setActiveTab] = useState<'company' | 'payment' | 'tickets' | 'tax'>('company');
  const [settings, setSettings] = useState<OwnerSettings>({
    company_name: '',
    company_description: '',
    company_logo: ''
  });
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethods>({
    cash: true,
    transfer: false,
    bml_gateway: false,
    other: false
  });
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [taxProfiles, setTaxProfiles] = useState<TaxProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TicketType | null>(null);
  const [editingTax, setEditingTax] = useState<TaxProfile | null>(null);

  const [newTicket, setNewTicket] = useState({
    name: '',
    code: '',
    base_price: '',
    currency: 'MVR',
    refundable: true
  });

  const [newTaxProfile, setNewTaxProfile] = useState({
    name: '',
    rounding_rule: 'ROUND_NEAREST',
    lines: [{ name: '', type: 'PERCENT', value: '', applies_to: 'FARE', active: true }]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      const [
        settingsResponse,
        paymentResponse,
        ticketTypesResponse,
        taxResponse
      ] = await Promise.all([
        apiService.getOwnerSettings(),
        apiService.getPaymentMethods(),
        apiService.getTicketTypes(),
        apiService.getTaxConfigurations()
      ]);
      
      if (settingsResponse.success) {
        setSettings(settingsResponse.settings);
      }
      
      if (paymentResponse.success) {
        setPaymentMethods(paymentResponse.payment_methods);
      }
      
      if (ticketTypesResponse.success) {
        setTicketTypes(ticketTypesResponse.ticket_types || []);
      }
      
      if (taxResponse.success) {
        setTaxProfiles(taxResponse.tax_profiles || []);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const saveCompanySettings = async () => {
    try {
      const response = await apiService.updateOwnerSettings(settings);
      if (response.success) {
        Alert.alert('Success', 'Company settings updated successfully');
      } else {
        Alert.alert('Error', response.error || 'Failed to update settings');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update settings');
    }
  };

  const savePaymentMethods = async () => {
    try {
      const response = await apiService.updatePaymentMethods(paymentMethods);
      if (response.success) {
        Alert.alert('Success', 'Payment methods updated successfully');
      } else {
        Alert.alert('Error', response.error || 'Failed to update payment methods');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update payment methods');
    }
  };

  const handleCreateTicketType = async () => {
    if (!newTicket.name.trim() || !newTicket.code.trim() || !newTicket.base_price) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const ticketData = {
        ...newTicket,
        base_price: parseFloat(newTicket.base_price)
      };

      const response = editingTicket 
        ? await apiService.updateTicketType(editingTicket.id, ticketData)
        : await apiService.createTicketType(ticketData);
      
      if (response.success) {
        Alert.alert('Success', editingTicket ? 'Ticket type updated' : 'Ticket type created');
        setShowTicketModal(false);
        resetTicketForm();
        loadData();
      } else {
        Alert.alert('Error', response.error || 'Failed to save ticket type');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save ticket type');
    }
  };

  const resetTicketForm = () => {
    setNewTicket({
      name: '',
      code: '',
      base_price: '',
      currency: 'MVR',
      refundable: true
    });
    setEditingTicket(null);
  };

  const editTicketType = (ticket: TicketType) => {
    setEditingTicket(ticket);
    setNewTicket({
      name: ticket.name,
      code: ticket.code,
      base_price: ticket.base_price.toString(),
      currency: ticket.currency,
      refundable: ticket.refundable
    });
    setShowTicketModal(true);
  };

  const deleteTicketType = async (ticketId: number) => {
    Alert.alert(
      'Delete Ticket Type',
      'Are you sure you want to delete this ticket type?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiService.deleteTicketType(ticketId);
              if (response.success) {
                Alert.alert('Success', 'Ticket type deleted');
                loadData();
              } else {
                Alert.alert('Error', response.error || 'Failed to delete ticket type');
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete ticket type');
            }
          },
        },
      ]
    );
  };

  const addTaxLine = () => {
    setNewTaxProfile(prev => ({
      ...prev,
      lines: [...prev.lines, { name: '', type: 'PERCENT', value: '', applies_to: 'FARE', active: true }]
    }));
  };

  const removeTaxLine = (index: number) => {
    if (newTaxProfile.lines.length > 1) {
      setNewTaxProfile(prev => ({
        ...prev,
        lines: prev.lines.filter((_, i) => i !== index)
      }));
    }
  };

  const updateTaxLine = (index: number, field: string, value: any) => {
    setNewTaxProfile(prev => ({
      ...prev,
      lines: prev.lines.map((line, i) => 
        i === index ? { ...line, [field]: value } : line
      )
    }));
  };

  const renderCompanyTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Company Name *</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter company name"
          value={settings.company_name}
          onChangeText={(value) => setSettings(prev => ({ ...prev, company_name: value }))}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Company Description</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          placeholder="Describe your boat service..."
          value={settings.company_description}
          onChangeText={(value) => setSettings(prev => ({ ...prev, company_description: value }))}
          multiline
          numberOfLines={4}
        />
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={saveCompanySettings}>
        <FontAwesome5 name="save" size={16} color="#FFF" />
        <Text style={styles.saveButtonText}>Save Company Info</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPaymentTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.subsectionTitle}>Payment Methods</Text>
      
      <View style={styles.paymentOption}>
        <View style={styles.paymentInfo}>
          <FontAwesome5 name="money-bill-wave" size={20} color="#10B981" />
          <Text style={styles.paymentLabel}>Cash Payment</Text>
        </View>
        <Switch
          value={paymentMethods.cash}
          onValueChange={(value) => setPaymentMethods(prev => ({ ...prev, cash: value }))}
        />
      </View>

      <View style={styles.paymentOption}>
        <View style={styles.paymentInfo}>
          <FontAwesome5 name="university" size={20} color="#3B82F6" />
          <Text style={styles.paymentLabel}>Bank Transfer</Text>
        </View>
        <Switch
          value={paymentMethods.transfer}
          onValueChange={(value) => setPaymentMethods(prev => ({ ...prev, transfer: value }))}
        />
      </View>

      <View style={styles.paymentOption}>
        <View style={styles.paymentInfo}>
          <FontAwesome5 name="qrcode" size={20} color="#8B5CF6" />
          <Text style={styles.paymentLabel}>BML Gateway</Text>
        </View>
        <Switch
          value={paymentMethods.bml_gateway}
          onValueChange={(value) => setPaymentMethods(prev => ({ ...prev, bml_gateway: value }))}
        />
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={savePaymentMethods}>
        <FontAwesome5 name="save" size={16} color="#FFF" />
        <Text style={styles.saveButtonText}>Save Payment Methods</Text>
      </TouchableOpacity>
    </View>
  );

  const renderTicketsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.subsectionTitle}>Ticket Types</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            resetTicketForm();
            setShowTicketModal(true);
          }}
        >
          <FontAwesome5 name="plus" size={16} color="#FFF" />
        </TouchableOpacity>
      </View>

      {ticketTypes.map(ticket => (
        <View key={ticket.id} style={styles.ticketTypeCard}>
          <View style={styles.ticketTypeInfo}>
            <Text style={styles.ticketTypeName}>{ticket.name}</Text>
            <Text style={styles.ticketTypeCode}>{ticket.code}</Text>
            <Text style={styles.ticketTypePrice}>
              {ticket.currency} {ticket.base_price.toFixed(2)}
            </Text>
            {ticket.refundable && (
              <Text style={styles.refundableLabel}>Refundable</Text>
            )}
          </View>
          <View style={styles.ticketTypeActions}>
            <TouchableOpacity
              style={styles.editTicketBtn}
              onPress={() => editTicketType(ticket)}
            >
              <FontAwesome5 name="edit" size={14} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteTicketBtn}
              onPress={() => deleteTicketType(ticket.id)}
            >
              <FontAwesome5 name="trash" size={14} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {ticketTypes.length === 0 && (
        <View style={styles.emptyState}>
          <FontAwesome5 name="ticket-alt" size={48} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>No Ticket Types</Text>
          <Text style={styles.emptyDescription}>
            Create your first ticket type to get started
          </Text>
        </View>
      )}
    </View>
  );

  const renderTaxTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.subsectionTitle}>Tax Profiles</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowTaxModal(true)}
        >
          <FontAwesome5 name="plus" size={16} color="#FFF" />
        </TouchableOpacity>
      </View>

      {taxProfiles.map(profile => (
        <View key={profile.id} style={styles.taxProfileCard}>
          <View style={styles.taxProfileInfo}>
            <Text style={styles.taxProfileName}>{profile.name}</Text>
            <Text style={styles.taxProfileDetails}>
              {profile.lines.length} tax line(s) • {profile.rounding_rule.replace('_', ' ')}
            </Text>
            <View style={styles.taxLines}>
              {profile.lines.map((line, index) => (
                <Text key={index} style={styles.taxLineText}>
                  {line.name}: {line.type === 'PERCENT' ? `${line.value}%` : `${line.value} MVR`}
                </Text>
              ))}
            </View>
          </View>
          <View style={styles.taxProfileActions}>
            <TouchableOpacity style={styles.editTaxBtn}>
              <FontAwesome5 name="edit" size={14} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteTaxBtn}>
              <FontAwesome5 name="trash" size={14} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {taxProfiles.length === 0 && (
        <View style={styles.emptyState}>
          <FontAwesome5 name="receipt" size={48} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>No Tax Profiles</Text>
          <Text style={styles.emptyDescription}>
            Create tax profiles to automatically calculate taxes
          </Text>
        </View>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <FontAwesome5 name="spinner" size={24} color="#007AFF" />
          <Text style={styles.loadingText}>Loading settings...</Text>
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
        <Text style={styles.headerTitle}>Owner Settings</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'company' && styles.activeTab]}
          onPress={() => setActiveTab('company')}
        >
          <FontAwesome5 name="building" size={16} color={activeTab === 'company' ? "#FFF" : "#6B7280"} />
          <Text style={[styles.tabText, activeTab === 'company' && styles.activeTabText]}>
            Company
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'payment' && styles.activeTab]}
          onPress={() => setActiveTab('payment')}
        >
          <FontAwesome5 name="credit-card" size={16} color={activeTab === 'payment' ? "#FFF" : "#6B7280"} />
          <Text style={[styles.tabText, activeTab === 'payment' && styles.activeTabText]}>
            Payment
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'tickets' && styles.activeTab]}
          onPress={() => setActiveTab('tickets')}
        >
          <FontAwesome5 name="ticket-alt" size={16} color={activeTab === 'tickets' ? "#FFF" : "#6B7280"} />
          <Text style={[styles.tabText, activeTab === 'tickets' && styles.activeTabText]}>
            Tickets
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'tax' && styles.activeTab]}
          onPress={() => setActiveTab('tax')}
        >
          <FontAwesome5 name="receipt" size={16} color={activeTab === 'tax' ? "#FFF" : "#6B7280"} />
          <Text style={[styles.tabText, activeTab === 'tax' && styles.activeTabText]}>
            Tax
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <ScrollView style={styles.content}>
        {activeTab === 'company' && renderCompanyTab()}
        {activeTab === 'payment' && renderPaymentTab()}
        {activeTab === 'tickets' && renderTicketsTab()}
        {activeTab === 'tax' && renderTaxTab()}
      </ScrollView>

      {/* Ticket Type Modal */}
      <Modal
        visible={showTicketModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTicketModal(false)}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowTicketModal(false)}
            >
              <FontAwesome5 name="times" size={20} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingTicket ? 'Edit Ticket Type' : 'Add Ticket Type'}
            </Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Ticket Type Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., Economy, VIP, Child"
                value={newTicket.name}
                onChangeText={(value) => setNewTicket(prev => ({ ...prev, name: value }))}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Code *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., ECO, VIP, CHD"
                value={newTicket.code}
                onChangeText={(value) => setNewTicket(prev => ({ ...prev, code: value.toUpperCase() }))}
                maxLength={10}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Base Price *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="0.00"
                value={newTicket.base_price}
                onChangeText={(value) => setNewTicket(prev => ({ ...prev, base_price: value }))}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Currency</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={newTicket.currency}
                  onValueChange={(value) => setNewTicket(prev => ({ ...prev, currency: value }))}
                  style={styles.picker}
                >
                  <Picker.Item label="MVR" value="MVR" />
                  <Picker.Item label="USD" value="USD" />
                </Picker>
              </View>
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Refundable</Text>
              <Switch
                value={newTicket.refundable}
                onValueChange={(value) => setNewTicket(prev => ({ ...prev, refundable: value }))}
              />
            </View>

            <TouchableOpacity style={styles.createButton} onPress={handleCreateTicketType}>
              <FontAwesome5 name={editingTicket ? "save" : "plus"} size={16} color="#FFF" />
              <Text style={styles.createButtonText}>
                {editingTicket ? 'Update Ticket Type' : 'Create Ticket Type'}
              </Text>
            </TouchableOpacity>
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
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: { padding: 8 },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  placeholder: { width: 36 },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
    gap: 4,
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#FFF',
  },

  content: {
    flex: 1,
  },
  tabContent: {
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },

  subsectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },

  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paymentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  ticketTypeCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  ticketTypeInfo: {
    flex: 1,
  },
  ticketTypeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  ticketTypeCode: {
    fontSize: 12,
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  ticketTypePrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 4,
  },
  refundableLabel: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  ticketTypeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editTicketBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteTicketBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  taxProfileCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  taxProfileInfo: {
    flex: 1,
  },
  taxProfileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  taxProfileDetails: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  taxLines: {
    gap: 2,
  },
  taxLineText: {
    fontSize: 12,
    color: '#374151',
  },
  taxProfileActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editTaxBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteTaxBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
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
  },

  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },

  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFF',
    overflow: 'hidden',
  },
  picker: {
    height: 48,
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
  modalContent: {
    flex: 1,
    padding: 16,
  },

  createButton: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  createButtonText: {
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