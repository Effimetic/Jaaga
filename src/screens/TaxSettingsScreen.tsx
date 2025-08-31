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

interface TaxConfig {
  id?: string;
  tax_name: string;
  rate_percent: number;
  inclusive: boolean;
  active: boolean;
}

export const TaxSettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [taxConfigs, setTaxConfigs] = useState<TaxConfig[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTax, setEditingTax] = useState<TaxConfig | null>(null);
  const [formData, setFormData] = useState<TaxConfig>({
    tax_name: '',
    rate_percent: 0,
    inclusive: false,
    active: true
  });

  const loadTaxConfigs = useCallback(async () => {
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

      // Load tax configs
      const { data: taxData, error } = await supabase
        .from('tax_configs')
        .select('*')
        .eq('owner_id', ownerData.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to load tax configs:', error);
        Alert.alert('Error', 'Failed to load tax configurations');
        return;
      }

      setTaxConfigs(taxData || []);
    } catch (error) {
      console.error('Failed to load tax configs:', error);
      Alert.alert('Error', 'Failed to load tax configurations');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadTaxConfigs();
  }, [loadTaxConfigs]);

  const handleSave = async () => {
    if (!user?.id) return;

    if (!formData.tax_name.trim()) {
      Alert.alert('Validation Error', 'Tax name is required');
      return;
    }

    if (formData.rate_percent < 0 || formData.rate_percent > 100) {
      Alert.alert('Validation Error', 'Tax rate must be between 0 and 100');
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

      const taxData = {
        owner_id: ownerData.id,
        tax_name: formData.tax_name.trim(),
        rate_percent: formData.rate_percent,
        inclusive: formData.inclusive,
        active: formData.active
      };

      let result;
      if (editingTax?.id) {
        // Update existing tax
        const { data, error } = await supabase
          .from('tax_configs')
          .update({
            ...taxData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingTax.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Create new tax
        const { data, error } = await supabase
          .from('tax_configs')
          .insert([taxData])
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      Alert.alert('Success', `Tax configuration ${editingTax?.id ? 'updated' : 'created'} successfully!`);
      
      // Reset form
      setFormData({
        tax_name: '',
        rate_percent: 0,
        inclusive: false,
        active: true
      });
      setShowAddForm(false);
      setEditingTax(null);
      
      // Reload data
      loadTaxConfigs();
    } catch (error: any) {
      console.error('Failed to save tax config:', error);
      Alert.alert('Error', error.message || 'Failed to save tax configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (tax: TaxConfig) => {
    setEditingTax(tax);
    setFormData(tax);
    setShowAddForm(true);
  };

  const handleDelete = (tax: TaxConfig) => {
    Alert.alert(
      'Delete Tax Configuration',
      `Are you sure you want to delete "${tax.tax_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('tax_configs')
                .delete()
                .eq('id', tax.id);

              if (error) throw error;

              Alert.alert('Success', 'Tax configuration deleted successfully!');
              loadTaxConfigs();
            } catch (error: any) {
              console.error('Failed to delete tax config:', error);
              Alert.alert('Error', error.message || 'Failed to delete tax configuration');
            }
          }
        }
      ]
    );
  };

  const handleCancel = () => {
    setFormData({
      tax_name: '',
      rate_percent: 0,
      inclusive: false,
      active: true
    });
    setShowAddForm(false);
    setEditingTax(null);
  };

  const renderTaxItem = (tax: TaxConfig) => (
    <TouchableOpacity 
      key={tax.id} 
      style={{ marginBottom: 12 }}
    >
      <Card variant="elevated" padding="none">
        {/* Tax Header */}
        <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#f4f4f5' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text variant="h6" color="primary" style={{ 
                fontSize: 14, 
                fontWeight: '600', 
                marginBottom: 4,
                color: '#18181b'
              }}>
                {tax.tax_name}
              </Text>
              <Text color="secondary" style={{ 
                fontSize: 11, 
                color: '#71717a'
              }}>
                {tax.rate_percent}% {tax.inclusive ? '(Inclusive)' : '(Exclusive)'}
              </Text>
            </View>

            {/* Status Badge */}
            <View style={{ 
              backgroundColor: tax.active ? '#10b98120' : '#ef444420',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center'
            }}>
              <MaterialCommunityIcons
                name={tax.active ? 'check-circle' : 'pause-circle'}
                size={12}
                color={tax.active ? '#10b981' : '#ef4444'}
                style={{ marginRight: 4 }}
              />
              <Text style={{ 
                color: tax.active ? '#10b981' : '#ef4444', 
                fontSize: 10, 
                fontWeight: '500' 
              }}>
                {tax.active ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        </View>

        {/* Tax Details */}
        <View style={{ padding: 12 }}>
          <View style={{ flexDirection: 'row', marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
              <MaterialCommunityIcons name="percent" size={14} color="#71717a" />
              <Text color="secondary" style={{ fontSize: 11, marginLeft: 4, color: '#71717a' }}>
                {tax.rate_percent}% rate
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons
                name={tax.inclusive ? 'check-circle' : 'plus-circle'}
                size={14}
                color="#71717a"
              />
              <Text color="secondary" style={{ fontSize: 11, marginLeft: 4, color: '#71717a' }}>
                {tax.inclusive ? 'Inclusive' : 'Exclusive'}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <TouchableOpacity
              onPress={() => handleEdit(tax)}
              style={{ 
                flex: 1, 
                marginRight: 4,
                backgroundColor: 'transparent',
                borderWidth: 1,
                borderColor: '#18181b',
                borderRadius: 6,
                paddingVertical: 8,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#18181b', fontSize: 12, fontWeight: '500' }}>
                Edit
            </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => handleDelete(tax)}
              style={{ 
                flex: 1, 
                marginLeft: 4,
                backgroundColor: 'transparent',
                borderWidth: 1,
                borderColor: '#ef4444',
                borderRadius: 6,
                paddingVertical: 8,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '500' }}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

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
            Tax Configuration
          </Text>
          <Text color="secondary" style={{ 
            marginTop: 4, 
            fontSize: 14,
            color: '#71717a'
          }}>
            Manage tax rates and rules for your business
          </Text>
        </View>

        {/* Add Tax Button - Top Right Corner */}
        {!showAddForm && (
          <View style={{ position: 'absolute', top: 20, right: 16, zIndex: 1000 }}>
            <TouchableOpacity
              onPress={() => setShowAddForm(true)}
              style={{
                backgroundColor: '#18181b',
                borderRadius: 20,
                paddingHorizontal: 16,
                paddingVertical: 12,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 4,
              }}
            >
              <MaterialCommunityIcons name="plus" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Add/Edit Form */}
        {showAddForm && (
          <View style={{ padding: 16, paddingTop: 8 }}>
            <Card variant="elevated" padding="md">
              <Text variant="h6" color="primary" style={{ 
                fontSize: 16, 
                fontWeight: '600', 
                marginBottom: 16,
                color: '#18181b'
              }}>
                {editingTax ? 'Edit Tax Configuration' : 'Add New Tax Configuration'}
              </Text>
              
              <View style={{ gap: 16 }}>
                <Input
                  label="Tax Name *"
                  value={formData.tax_name}
                  onChangeText={(text: string) => 
                    setFormData(prev => ({ ...prev, tax_name: text }))
                  }
                  placeholder="e.g., GST, Service Tax, Tourism Tax"
                  style={{
                    fontSize: 14,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                  }}
                />

                <Input
                  label="Tax Rate (%) *"
                  value={formData.rate_percent.toString()}
                  onChangeText={(text: string) => {
                    const rate = parseFloat(text) || 0;
                    setFormData(prev => ({ ...prev, rate_percent: rate }));
                  }}
                  placeholder="0.00"
                  keyboardType="numeric"
                  style={{
                    fontSize: 14,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                  }}
                />

                {/* Tax Type Selection */}
                <View>
                  <Text style={{ 
                    fontSize: 12, 
                    fontWeight: '500', 
                    marginBottom: 8,
                    color: '#374151'
                  }}>
                    Tax Type *
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    {[
                      { key: false, label: 'Exclusive', description: 'Tax added on top of price' },
                      { key: true, label: 'Inclusive', description: 'Tax included in price' },
                    ].map((type) => (
                      <TouchableOpacity
                        key={type.key.toString()}
                        onPress={() => setFormData(prev => ({ ...prev, inclusive: type.key }))}
                        style={{
                          flex: 1,
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: formData.inclusive === type.key ? '#18181b' : '#d1d5db',
                          backgroundColor: formData.inclusive === type.key ? '#18181b' + '10' : '#ffffff',
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{
                          fontSize: 14,
                          fontWeight: '600',
                          color: formData.inclusive === type.key ? '#18181b' : '#71717a',
                          marginBottom: 4
                        }}>
                          {type.label}
                        </Text>
                        <Text style={{
                          fontSize: 11,
                          color: formData.inclusive === type.key ? '#18181b' : '#71717a',
                          textAlign: 'center'
                        }}>
                          {type.description}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Status Toggle */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ 
                    fontSize: 14, 
                    fontWeight: '500',
                    color: '#374151'
                  }}>
                    Active
                  </Text>
                  <TouchableOpacity
                    onPress={() => setFormData(prev => ({ ...prev, active: !prev.active }))}
                    style={{
                      width: 50,
                      height: 30,
                      borderRadius: 15,
                      backgroundColor: formData.active ? '#10b981' : '#d1d5db',
                      alignItems: formData.active ? 'flex-end' : 'flex-start',
                      justifyContent: 'center',
                      paddingHorizontal: 2
                    }}
                  >
                    <View style={{
                      width: 26,
                      height: 26,
                      borderRadius: 13,
                      backgroundColor: '#ffffff',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.2,
                      shadowRadius: 2,
                      elevation: 2
                    }} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Form Actions */}
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                <TouchableOpacity
                  onPress={handleCancel}
                  style={{
                    flex: 1,
                    backgroundColor: 'transparent',
                    borderWidth: 1,
                    borderColor: '#d1d5db',
                    borderRadius: 8,
                    paddingVertical: 12,
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Text style={{ 
                    color: '#6b7280', 
                    fontSize: 14, 
                    fontWeight: '600' 
                  }}>
                    Cancel
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
                    fontSize: 14, 
                    fontWeight: '600' 
                  }}>
                    {saving ? 'Saving...' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>
          </View>
        )}

        {/* Tax Configurations List */}
        <View style={{ padding: 16, paddingTop: showAddForm ? 0 : 8 }}>
          {taxConfigs.length === 0 ? (
            <Card variant="outlined" padding="md">
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <MaterialCommunityIcons
                  name="percent"
                  size={48}
                  color="#71717a"
                />
                <Text variant="h6" color="primary" style={{ 
                  fontSize: 16, 
                  fontWeight: '600', 
                  marginTop: 16, 
                  marginBottom: 8,
                  color: '#18181b'
                }}>
                  No Tax Configurations
                </Text>
                <Text color="secondary" style={{ 
                  fontSize: 14, 
                  textAlign: 'center',
                  color: '#71717a'
                }}>
                  Add your first tax configuration to start managing tax rates
                </Text>
              </View>
            </Card>
          ) : (
            taxConfigs.map(renderTaxItem)
          )}
        </View>
      </ScrollView>
    </Surface>
  );
};
