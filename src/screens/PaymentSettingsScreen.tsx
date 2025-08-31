import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    ScrollView,
    TouchableOpacity,
    View
} from 'react-native';
import { Card, Surface, Text } from '../components/catalyst';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';

interface PaymentMethod {
  id: string;
  name: string;
  code: string;
  description: string;
  icon: string;
  requiresConfig: boolean;
  configType?: 'gateway' | 'bank_account';
}

interface PaymentConfig {
  id?: string;
  owner_id: string;
  public_allowed_methods: string[];
  agent_allowed_methods: string[];
  owner_portal_allowed_methods: string[];
  bml_keys_masked?: any;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'cash',
    name: 'Cash',
    code: 'CASH',
    description: 'Accept cash payments',
    icon: 'cash',
    requiresConfig: false
  },
  {
    id: 'bank_transfer',
    name: 'Bank Transfer',
    code: 'BANK_TRANSFER',
    description: 'Accept bank transfer payments',
    icon: 'bank-transfer',
    requiresConfig: true,
    configType: 'bank_account'
  },
  {
    id: 'online_card',
    name: 'Online Card (BML Gateway)',
    code: 'CARD_BML',
    description: 'Accept online card payments via BML Gateway',
    icon: 'credit-card',
    requiresConfig: true,
    configType: 'gateway'
  }
];

export const PaymentSettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>({
    owner_id: '',
    public_allowed_methods: [],
    agent_allowed_methods: [],
    owner_portal_allowed_methods: []
  });
  const [bmlConfigured, setBmlConfigured] = useState(false);
  const [bankAccountsCount, setBankAccountsCount] = useState(0);

  const loadPaymentConfig = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Get owner ID
      const { data: ownerData, error: ownerError } = await supabase
        .from('owners')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (ownerError || !ownerData) {
        Alert.alert('Error', 'Owner account not found');
        return;
      }

      setPaymentConfig(prev => ({ ...prev, owner_id: ownerData.id }));

      // Load existing payment config
      const { data: configData, error: configError } = await supabase
        .from('payment_configs')
        .select('*')
        .eq('owner_id', ownerData.id)
        .single();

      if (configError && configError.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Failed to load payment config:', configError);
        Alert.alert('Error', 'Failed to load payment configuration');
        return;
      }

      if (configData) {
        setPaymentConfig({
          id: configData.id,
          owner_id: configData.owner_id,
          public_allowed_methods: configData.public_allowed_methods || [],
          agent_allowed_methods: configData.agent_allowed_methods || [],
          owner_portal_allowed_methods: configData.owner_portal_allowed_methods || [],
          bml_keys_masked: configData.bml_keys_masked
        });

        // Check if BML is configured
        if (configData.bml_keys_masked && configData.bml_keys_masked.merchant_id) {
          setBmlConfigured(true);
        }
      }

      // Count bank accounts
      const { count: bankCount, error: bankError } = await supabase
        .from('owner_bank_accounts')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', ownerData.id)
        .eq('active', true);

      if (bankError) {
        console.error('Failed to count bank accounts:', bankError);
      } else {
        setBankAccountsCount(bankCount || 0);
      }
    } catch (error) {
      console.error('Failed to load payment config:', error);
      Alert.alert('Error', 'Failed to load payment configuration');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadPaymentConfig();
  }, [loadPaymentConfig]);

  const togglePaymentMethod = (methodCode: string, channel: 'public' | 'agent' | 'owner_portal') => {
    const channelKey = `${channel}_allowed_methods` as keyof PaymentConfig;
    const currentMethods = paymentConfig[channelKey] as string[];
    
    if (currentMethods.includes(methodCode)) {
      // Remove method
      setPaymentConfig(prev => ({
        ...prev,
        [channelKey]: currentMethods.filter(m => m !== methodCode)
      }));
    } else {
      // Add method - check dependencies first
      const method = PAYMENT_METHODS.find(m => m.code === methodCode);
      
      if (method?.requiresConfig) {
        if (method.configType === 'gateway' && !bmlConfigured) {
          Alert.alert(
            'Configuration Required',
            'BML Gateway must be configured before enabling online card payments. Please configure the gateway first.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Configure Gateway', onPress: () => navigation.navigate('GatewaySettings') }
            ]
          );
          return;
        }
        
        if (method.configType === 'bank_account' && bankAccountsCount === 0) {
          Alert.alert(
            'Bank Account Required',
            'You must add at least one bank account before enabling bank transfer payments.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Add Bank Account', onPress: () => navigation.navigate('BankAccountSettings') }
            ]
          );
          return;
        }
      }
      
      // Add method
      setPaymentConfig(prev => ({
        ...prev,
        [channelKey]: [...currentMethods, methodCode]
      }));
    }
  };

  const handleSave = async () => {
    if (!paymentConfig.owner_id) return;

    try {
      setSaving(true);

      // Upsert payment config (will create if doesn't exist, update if exists)
      const { error } = await supabase
        .from('payment_configs')
        .upsert({
          id: paymentConfig.id, // Include ID if exists for update
          owner_id: paymentConfig.owner_id,
          public_allowed_methods: paymentConfig.public_allowed_methods,
          agent_allowed_methods: paymentConfig.agent_allowed_methods,
          owner_portal_allowed_methods: paymentConfig.owner_portal_allowed_methods,
          bml_keys_masked: paymentConfig.bml_keys_masked,
          updated_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }

      Alert.alert('Success', 'Payment configuration saved successfully!');
      
      // Reload config to get the updated ID
      loadPaymentConfig();
    } catch (error: any) {
      console.error('Failed to save payment config:', error);
      Alert.alert('Error', error.message || 'Failed to save payment configuration');
    } finally {
      setSaving(false);
    }
  };

  const renderPaymentMethodCard = (method: PaymentMethod) => {
    const isPublicEnabled = paymentConfig.public_allowed_methods.includes(method.code);
    const isAgentEnabled = paymentConfig.agent_allowed_methods.includes(method.code);
    const isOwnerEnabled = paymentConfig.owner_portal_allowed_methods.includes(method.code);
    
    const canEnable = !method.requiresConfig || 
      (method.configType === 'gateway' && bmlConfigured) ||
      (method.configType === 'bank_account' && bankAccountsCount > 0);

    return (
      <Card key={method.id} variant="elevated" padding="md" style={{ marginBottom: 16 }}>
        {/* Method Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <MaterialCommunityIcons
            name={method.icon as any}
            size={24}
            color={canEnable ? '#18181b' : '#9ca3af'}
            style={{ marginRight: 12 }}
          />
          <View style={{ flex: 1 }}>
            <Text variant="h6" color="primary" style={{ 
              fontSize: 16, 
              fontWeight: '600',
              color: canEnable ? '#18181b' : '#9ca3af'
            }}>
              {method.name}
            </Text>
            <Text color="secondary" style={{ 
              fontSize: 12,
              color: '#71717a'
            }}>
              {method.description}
            </Text>
          </View>
        </View>

        {/* Configuration Status */}
        {method.requiresConfig && (
          <View style={{ 
            backgroundColor: canEnable ? '#10b98110' : '#ef444410',
            padding: 12,
            borderRadius: 8,
            marginBottom: 16
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons
                name={canEnable ? 'check-circle' : 'alert-circle'}
                size={16}
                color={canEnable ? '#10b981' : '#ef4444'}
                style={{ marginRight: 8 }}
              />
              <Text style={{ 
                fontSize: 12,
                color: canEnable ? '#10b981' : '#ef4444',
                fontWeight: '500'
              }}>
                {method.configType === 'gateway' 
                  ? (bmlConfigured ? 'BML Gateway configured' : 'BML Gateway not configured')
                  : (bankAccountsCount > 0 ? 'Bank accounts available' : 'No bank accounts configured')
                }
              </Text>
            </View>
          </View>
        )}

        {/* Channel Toggles */}
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="web" size={16} color="#71717a" style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 14, color: '#374151' }}>Public Portal</Text>
            </View>
            <TouchableOpacity
              onPress={() => togglePaymentMethod(method.code, 'public')}
              disabled={!canEnable}
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                backgroundColor: isPublicEnabled ? '#10b981' : '#d1d5db',
                alignItems: isPublicEnabled ? 'flex-end' : 'flex-start',
                justifyContent: 'center',
                paddingHorizontal: 2,
                opacity: canEnable ? 1 : 0.5
              }}
            >
              <View style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: '#ffffff',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.2,
                shadowRadius: 1,
                elevation: 1
              }} />
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="account-group" size={16} color="#71717a" style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 14, color: '#374151' }}>Agent Portal</Text>
            </View>
            <TouchableOpacity
              onPress={() => togglePaymentMethod(method.code, 'agent')}
              disabled={!canEnable}
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                backgroundColor: isAgentEnabled ? '#10b981' : '#d1d5db',
                alignItems: isAgentEnabled ? 'flex-end' : 'flex-start',
                justifyContent: 'center',
                paddingHorizontal: 2,
                opacity: canEnable ? 1 : 0.5
              }}
            >
              <View style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: '#ffffff',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.2,
                shadowRadius: 1,
                elevation: 1
              }} />
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="store" size={16} color="#71717a" style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 14, color: '#374151' }}>Owner Portal</Text>
            </View>
            <TouchableOpacity
              onPress={() => togglePaymentMethod(method.code, 'owner_portal')}
              disabled={!canEnable}
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                backgroundColor: isOwnerEnabled ? '#10b981' : '#d1d5db',
                alignItems: isOwnerEnabled ? 'flex-end' : 'flex-start',
                justifyContent: 'center',
                paddingHorizontal: 2,
                opacity: canEnable ? 1 : 0.5
              }}
            >
              <View style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: '#ffffff',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.2,
                shadowRadius: 1,
                elevation: 1
              }} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Action Buttons */}
        {method.requiresConfig && (
          <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f4f4f5' }}>
            <TouchableOpacity
              onPress={() => {
                if (method.configType === 'gateway') {
                  navigation.navigate('GatewaySettings');
                } else if (method.configType === 'bank_account') {
                  navigation.navigate('BankAccountSettings');
                }
              }}
              style={{
                backgroundColor: 'transparent',
                borderWidth: 1,
                borderColor: '#18181b',
                borderRadius: 6,
                paddingVertical: 8,
                paddingHorizontal: 16,
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Text style={{ 
                color: '#18181b', 
                fontSize: 12, 
                fontWeight: '500' 
              }}>
                {method.configType === 'gateway' ? 'Configure Gateway' : 'Manage Bank Accounts'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </Card>
    );
  };

  return (
    <Surface variant="default" style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* Header */}
        <View style={{ padding: 16, paddingTop: 20, backgroundColor: '#ffffff' }}>
          <Text variant="h4" color="primary" style={{ 
            fontSize: 20, 
            fontWeight: '600',
            color: '#18181b'
          }}>
            Payment Methods
          </Text>
          <Text color="secondary" style={{ 
            marginTop: 4, 
            fontSize: 14,
            color: '#71717a'
          }}>
            Configure accepted payment methods for different channels
          </Text>
        </View>

        {/* Payment Methods List */}
        <View style={{ padding: 16, paddingTop: 8 }}>
          {PAYMENT_METHODS.map(renderPaymentMethodCard)}
        </View>

        {/* Summary Card */}
        <View style={{ padding: 16, paddingTop: 0 }}>
          <Card variant="outlined" padding="md">
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <MaterialCommunityIcons
                name="information"
                size={20}
                color="#3b82f6"
                style={{ marginRight: 12, marginTop: 2 }}
              />
              <View style={{ flex: 1 }}>
                <Text variant="h6" color="primary" style={{ 
                  fontSize: 14, 
                  fontWeight: '600', 
                  marginBottom: 4,
                  color: '#18181b'
                }}>
                  Configuration Summary
                </Text>
                <Text color="secondary" style={{ 
                  fontSize: 12, 
                  color: '#71717a',
                  lineHeight: 16
                }}>
                  • Public Portal: {paymentConfig.public_allowed_methods.length} methods enabled{'\n'}
                  • Agent Portal: {paymentConfig.agent_allowed_methods.length} methods enabled{'\n'}
                  • Owner Portal: {paymentConfig.owner_portal_allowed_methods.length} methods enabled{'\n'}
                  • BML Gateway: {bmlConfigured ? 'Configured' : 'Not configured'}{'\n'}
                  • Bank Accounts: {bankAccountsCount} account{bankAccountsCount !== 1 ? 's' : ''} available
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Action Buttons */}
        <View style={{ padding: 16, paddingTop: 0 }}>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={{
              backgroundColor: '#18181b',
              borderRadius: 8,
              paddingVertical: 12,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: saving ? 0.6 : 1
            }}
          >
            <Text style={{ 
              color: '#ffffff', 
              fontSize: 16, 
              fontWeight: '600' 
            }}>
              {saving ? 'Saving...' : 'Save Configuration'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Surface>
  );
};
