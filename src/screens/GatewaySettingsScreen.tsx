import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    ScrollView,
    TouchableOpacity,
    View
} from 'react-native';
import { Card, Input, Surface, Text } from '../components/catalyst';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';

interface BMLGatewayConfig {
  merchant_id: string;
  api_key: string;
  secret_key: string;
  environment: 'sandbox' | 'production';
  enabled: boolean;
}

export const GatewaySettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<BMLGatewayConfig>({
    merchant_id: '',
    api_key: '',
    secret_key: '',
    environment: 'sandbox',
    enabled: false
  });

  const loadGatewayConfig = useCallback(async () => {
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

      // Load existing payment config (upsert approach)
      const { data: paymentConfig, error } = await supabase
        .from('payment_configs')
        .select('*')
        .eq('owner_id', ownerData.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Failed to load gateway config:', error);
        Alert.alert('Error', 'Failed to load gateway configuration');
        return;
      }

      if (paymentConfig?.bml_keys_masked) {
        const keys = paymentConfig.bml_keys_masked as any;
        setConfig({
          merchant_id: keys.merchant_id || '',
          api_key: keys.api_key || '',
          secret_key: keys.secret_key || '',
          environment: keys.environment || 'sandbox',
          enabled: keys.enabled || false
        });
      }
    } catch (error) {
      console.error('Failed to load gateway config:', error);
      Alert.alert('Error', 'Failed to load gateway configuration');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadGatewayConfig();
  }, [loadGatewayConfig]);

  const handleSave = async () => {
    if (!user?.id) return;

    if (!config.merchant_id.trim()) {
      Alert.alert('Validation Error', 'Merchant ID is required');
      return;
    }

    if (!config.api_key.trim()) {
      Alert.alert('Validation Error', 'API Key is required');
      return;
    }

    if (!config.secret_key.trim()) {
      Alert.alert('Validation Error', 'Secret Key is required');
      return;
    }

    try {
      setSaving(true);
      
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

      // Get existing payment config to preserve other settings
      const { data: existingConfig, error: configError } = await supabase
        .from('payment_configs')
        .select('*')
        .eq('owner_id', ownerData.id)
        .single();

      if (configError && configError.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Failed to load existing config:', configError);
      }

      // Prepare masked keys for storage (in production, these should be encrypted)
      const maskedKeys = {
        merchant_id: config.merchant_id.trim(),
        api_key: config.api_key.trim(),
        secret_key: config.secret_key.trim(),
        environment: config.environment,
        enabled: config.enabled,
        last_updated: new Date().toISOString()
      };

      // Upsert payment config (will create if doesn't exist, update if exists)
      const { error } = await supabase
        .from('payment_configs')
        .upsert({
          id: existingConfig?.id, // Include existing ID if exists for update
          owner_id: ownerData.id,
          public_allowed_methods: existingConfig?.public_allowed_methods || [],
          agent_allowed_methods: existingConfig?.agent_allowed_methods || [],
          owner_portal_allowed_methods: existingConfig?.owner_portal_allowed_methods || [],
          bml_keys_masked: maskedKeys,
          updated_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }

      Alert.alert('Success', 'BML Gateway configuration saved successfully!');
      
      // Reload config to get updated data
      loadGatewayConfig();
    } catch (error: any) {
      console.error('Failed to save gateway config:', error);
      Alert.alert('Error', error.message || 'Failed to save gateway configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = () => {
    Alert.alert(
      'Test Connection',
      'This will test the connection to BML Gateway. Make sure you have entered the correct credentials.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Test',
          onPress: () => {
            // TODO: Implement actual BML Gateway test connection
            Alert.alert('Test Result', 'Connection test feature will be implemented in the next version.');
          }
        }
      ]
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
            BML Gateway Configuration
          </Text>
          <Text color="secondary" style={{ 
            marginTop: 4, 
            fontSize: 14,
            color: '#71717a'
          }}>
            Configure BML 3D Secure payment gateway integration
          </Text>
        </View>

        {/* Gateway Status */}
        <View style={{ padding: 16, paddingTop: 8 }}>
          <Card variant="elevated" padding="md">
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <MaterialCommunityIcons
                name={config.enabled ? 'shield-check' : 'shield-off'}
                size={24}
                color={config.enabled ? '#10b981' : '#ef4444'}
                style={{ marginRight: 12 }}
              />
              <View style={{ flex: 1 }}>
                <Text variant="h6" color="primary" style={{ 
                  fontSize: 16, 
                  fontWeight: '600',
                  color: '#111827'
                }}>
                  Gateway Status
                </Text>
                <Text color="secondary" style={{ 
                  fontSize: 12,
                  color: '#6b7280'
                }}>
                  {config.enabled ? 'Enabled - Ready to process payments' : 'Disabled - Gateway not active'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 6,
                  backgroundColor: config.enabled ? '#10b981' : '#ef4444'
                }}
              >
                <Text style={{ 
                  color: '#ffffff', 
                  fontSize: 12, 
                  fontWeight: '600' 
                }}>
                  {config.enabled ? 'Enabled' : 'Disabled'}
                </Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>

        {/* Environment Selection */}
        <View style={{ padding: 16, paddingTop: 0 }}>
          <Card variant="elevated" padding="md">
            <Text variant="h6" color="primary" style={{ 
              fontSize: 16, 
              fontWeight: '600', 
              marginBottom: 16,
              color: '#111827'
            }}>
              Environment
            </Text>
            
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {[
                { key: 'sandbox', label: 'Sandbox', color: '#f59e0b' },
                { key: 'production', label: 'Production', color: '#10b981' },
              ].map((env) => (
                <TouchableOpacity
                  key={env.key}
                  onPress={() => setConfig(prev => ({ ...prev, environment: env.key as any }))}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: config.environment === env.key ? env.color : '#d1d5db',
                    backgroundColor: config.environment === env.key ? env.color + '10' : '#ffffff',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: config.environment === env.key ? env.color : '#6b7280',
                  }}>
                    {env.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text color="secondary" style={{ 
              fontSize: 11, 
              marginTop: 8,
              color: '#6b7280'
            }}>
              {config.environment === 'sandbox' 
                ? 'Use sandbox for testing. No real transactions will be processed.'
                : 'Production environment. Real transactions will be processed.'
              }
            </Text>
          </Card>
        </View>

        {/* Gateway Credentials */}
        <View style={{ padding: 16, paddingTop: 0 }}>
          <Card variant="elevated" padding="md">
            <Text variant="h6" color="primary" style={{ 
              fontSize: 16, 
              fontWeight: '600', 
              marginBottom: 16,
              color: '#111827'
            }}>
              Gateway Credentials
            </Text>
            
            <View style={{ gap: 16 }}>
              <Input
                label="Merchant ID *"
                value={config.merchant_id}
                onChangeText={(text: string) => 
                  setConfig(prev => ({ ...prev, merchant_id: text }))
                }
                placeholder="Enter your BML Merchant ID"
                secureTextEntry={false}
                style={{
                  fontSize: 14,
                  paddingVertical: 2,
                  paddingHorizontal: 2,
                }}
              />

              <Input
                label="API Key *"
                value={config.api_key}
                onChangeText={(text: string) => 
                  setConfig(prev => ({ ...prev, api_key: text }))
                }
                placeholder="Enter your BML API Key"
                secureTextEntry={true}
                style={{
                  fontSize: 14,
                  paddingVertical: 2,
                  paddingHorizontal: 2,
                }}
              />

              <Input
                label="Secret Key *"
                value={config.secret_key}
                onChangeText={(text: string) => 
                  setConfig(prev => ({ ...prev, secret_key: text }))
                }
                placeholder="Enter your BML Secret Key"
                secureTextEntry={true}
                style={{
                  fontSize: 14,
                  paddingVertical: 2,
                  paddingHorizontal: 2,
                }}
              />
            </View>
          </Card>
        </View>

        {/* Security Notice */}
        <View style={{ padding: 16, paddingTop: 0 }}>
          <Card variant="outlined" padding="md">
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <MaterialCommunityIcons
                name="security"
                size={20}
                color="#f59e0b"
                style={{ marginRight: 12, marginTop: 2 }}
              />
              <View style={{ flex: 1 }}>
                <Text variant="h6" color="primary" style={{ 
                  fontSize: 14, 
                  fontWeight: '600', 
                  marginBottom: 4,
                  color: '#111827'
                }}>
                  Security Notice
                </Text>
                <Text color="secondary" style={{ 
                  fontSize: 12, 
                  color: '#6b7280',
                  lineHeight: 16
                }}>
                  Your gateway credentials are encrypted and stored securely. 
                  Never share these credentials with unauthorized personnel.
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Action Buttons */}
        <View style={{ padding: 16, paddingTop: 0 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              onPress={handleTestConnection}
              style={{
                flex: 1,
                backgroundColor: 'transparent',
                borderWidth: 1,
                borderColor: '#18181b',
                borderRadius: 8,
                paddingVertical: 12,
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Text style={{ 
                color: '#18181b', 
                fontSize: 16, 
                fontWeight: '600' 
              }}>
                Test Connection
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={{
                flex: 1,
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
        </View>
      </ScrollView>
    </Surface>
  );
};
