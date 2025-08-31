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

interface TicketType {
  id?: string;
  code: string;
  name: string;
  currency: string;
  base_price: number;
  tax_rule_id?: string;
  active: boolean;
}

export const TicketTypeSettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [taxConfigs, setTaxConfigs] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTicketType, setEditingTicketType] = useState<TicketType | null>(null);
  const [formData, setFormData] = useState<TicketType>({
    code: '',
    name: '',
    currency: 'MVR',
    base_price: 0,
    tax_rule_id: undefined,
    active: true
  });

  const loadTicketTypes = useCallback(async () => {
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

      // Load ticket types
      const { data: ticketData, error } = await supabase
        .from('ticket_types')
        .select('*')
        .eq('owner_id', ownerData.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to load ticket types:', error);
        Alert.alert('Error', 'Failed to load ticket types');
        return;
      }

      setTicketTypes(ticketData || []);

      // Load tax configs for dropdown
      const { data: taxData } = await supabase
        .from('tax_configs')
        .select('id, tax_name, rate_percent')
        .eq('owner_id', ownerData.id)
        .eq('active', true);

      setTaxConfigs(taxData || []);
    } catch (error) {
      console.error('Failed to load ticket types:', error);
      Alert.alert('Error', 'Failed to load ticket types');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadTicketTypes();
  }, [loadTicketTypes]);

  const handleSave = async () => {
    if (!user?.id) return;

    if (!formData.code.trim()) {
      Alert.alert('Validation Error', 'Ticket code is required');
      return;
    }

    if (!formData.name.trim()) {
      Alert.alert('Validation Error', 'Ticket name is required');
      return;
    }

    if (formData.base_price < 0) {
      Alert.alert('Validation Error', 'Base price must be 0 or greater');
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

      const ticketData = {
        owner_id: ownerData.id,
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        currency: formData.currency,
        base_price: formData.base_price,
        tax_rule_id: formData.tax_rule_id || null,
        active: formData.active
      };

      let result;
      if (editingTicketType?.id) {
        // Update existing ticket type
        const { data, error } = await supabase
          .from('ticket_types')
          .update({
            ...ticketData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingTicketType.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Create new ticket type
        const { data, error } = await supabase
          .from('ticket_types')
          .insert([ticketData])
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      Alert.alert('Success', `Ticket type ${editingTicketType?.id ? 'updated' : 'created'} successfully!`);
      
      // Reset form
      setFormData({
        code: '',
        name: '',
        currency: 'MVR',
        base_price: 0,
        tax_rule_id: undefined,
        active: true
      });
      setShowAddForm(false);
      setEditingTicketType(null);
      
      // Reload data
      loadTicketTypes();
    } catch (error: any) {
      console.error('Failed to save ticket type:', error);
      Alert.alert('Error', error.message || 'Failed to save ticket type');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (ticketType: TicketType) => {
    setEditingTicketType(ticketType);
    setFormData(ticketType);
    setShowAddForm(true);
  };

  const handleDelete = (ticketType: TicketType) => {
    Alert.alert(
      'Delete Ticket Type',
      `Are you sure you want to delete "${ticketType.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('ticket_types')
                .delete()
                .eq('id', ticketType.id);

              if (error) throw error;

              Alert.alert('Success', 'Ticket type deleted successfully!');
              loadTicketTypes();
            } catch (error: any) {
              console.error('Failed to delete ticket type:', error);
              Alert.alert('Error', error.message || 'Failed to delete ticket type');
            }
          }
        }
      ]
    );
  };

  const handleCancel = () => {
    setFormData({
      code: '',
      name: '',
      currency: 'MVR',
      base_price: 0,
      tax_rule_id: undefined,
      active: true
    });
    setShowAddForm(false);
    setEditingTicketType(null);
  };

  const renderTicketTypeItem = (ticketType: TicketType) => (
    <TouchableOpacity 
      key={ticketType.id} 
      style={{ marginBottom: 12 }}
    >
      <Card variant="elevated" padding="none">
        {/* Ticket Type Header */}
        <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#f4f4f5' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text variant="h6" color="primary" style={{ 
                fontSize: 14, 
                fontWeight: '600', 
                marginBottom: 4,
                color: '#18181b'
              }}>
                {ticketType.name}
              </Text>
              <Text color="secondary" style={{ 
                fontSize: 11, 
                color: '#71717a'
              }}>
                Code: {ticketType.code} • {ticketType.currency} {ticketType.base_price.toFixed(2)}
              </Text>
            </View>

            {/* Status Badge */}
            <View style={{ 
              backgroundColor: ticketType.active ? '#10b98120' : '#ef444420',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center'
            }}>
              <MaterialCommunityIcons
                name={ticketType.active ? 'check-circle' : 'pause-circle'}
                size={12}
                color={ticketType.active ? '#10b981' : '#ef4444'}
                style={{ marginRight: 4 }}
              />
              <Text style={{ 
                color: ticketType.active ? '#10b981' : '#ef4444', 
                fontSize: 10, 
                fontWeight: '500' 
              }}>
                {ticketType.active ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        </View>

        {/* Ticket Type Details */}
        <View style={{ padding: 12 }}>
          <View style={{ flexDirection: 'row', marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
              <MaterialCommunityIcons name="ticket" size={14} color="#71717a" />
              <Text color="secondary" style={{ fontSize: 11, marginLeft: 4, color: '#71717a' }}>
                {ticketType.code}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="currency-usd" size={14} color="#71717a" />
              <Text color="secondary" style={{ fontSize: 11, marginLeft: 4, color: '#71717a' }}>
                {ticketType.currency} {ticketType.base_price.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <TouchableOpacity
              onPress={() => handleEdit(ticketType)}
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
              onPress={() => handleDelete(ticketType)}
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
            Ticket Types
          </Text>
          <Text color="secondary" style={{ 
            marginTop: 4, 
            fontSize: 14,
            color: '#71717a'
          }}>
            Manage ticket types and pricing for your routes
          </Text>
        </View>

        {/* Add Ticket Type Button - Top Right Corner */}
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
                {editingTicketType ? 'Edit Ticket Type' : 'Add New Ticket Type'}
              </Text>
              
              <View style={{ gap: 16 }}>
                <Input
                  label="Ticket Code *"
                  value={formData.code}
                  onChangeText={(text: string) => 
                    setFormData(prev => ({ ...prev, code: text }))
                  }
                  placeholder="e.g., ADULT, CHILD, SENIOR"
                  style={{
                    fontSize: 14,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                  }}
                />

                <Input
                  label="Ticket Name *"
                  value={formData.name}
                  onChangeText={(text: string) => 
                    setFormData(prev => ({ ...prev, name: text }))
                  }
                  placeholder="e.g., Adult Ticket, Child Ticket"
                  style={{
                    fontSize: 14,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                  }}
                />

                <Input
                  label="Base Price *"
                  value={formData.base_price.toString()}
                  onChangeText={(text: string) => {
                    const price = parseFloat(text) || 0;
                    setFormData(prev => ({ ...prev, base_price: price }));
                  }}
                  placeholder="0.00"
                  keyboardType="numeric"
                  style={{
                    fontSize: 14,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                  }}
                />

                {/* Currency Selection */}
                <View>
                  <Text style={{ 
                    fontSize: 12, 
                    fontWeight: '500', 
                    marginBottom: 8,
                    color: '#374151'
                  }}>
                    Currency *
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    {[
                      { key: 'MVR', label: 'MVR (Maldivian Rufiyaa)' },
                      { key: 'USD', label: 'USD (US Dollar)' },
                    ].map((currency) => (
                      <TouchableOpacity
                        key={currency.key}
                        onPress={() => setFormData(prev => ({ ...prev, currency: currency.key }))}
                        style={{
                          flex: 1,
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: formData.currency === currency.key ? '#18181b' : '#d1d5db',
                          backgroundColor: formData.currency === currency.key ? '#18181b' + '10' : '#ffffff',
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{
                          fontSize: 14,
                          fontWeight: '600',
                          color: formData.currency === currency.key ? '#18181b' : '#71717a',
                          marginBottom: 4
                        }}>
                          {currency.key}
                        </Text>
                        <Text style={{
                          fontSize: 11,
                          color: formData.currency === currency.key ? '#18181b' : '#71717a',
                          textAlign: 'center'
                        }}>
                          {currency.label}
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
                    color: '#71717a', 
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

        {/* Ticket Types List */}
        <View style={{ padding: 16, paddingTop: showAddForm ? 0 : 8 }}>
          {ticketTypes.length === 0 ? (
            <Card variant="outlined" padding="md">
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <MaterialCommunityIcons
                  name="ticket"
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
                  No Ticket Types
                </Text>
                <Text color="secondary" style={{ 
                  fontSize: 14, 
                  textAlign: 'center',
                  color: '#71717a'
                }}>
                  Add your first ticket type to start managing pricing
                </Text>
              </View>
            </Card>
          ) : (
            ticketTypes.map(renderTicketTypeItem)
          )}
        </View>
      </ScrollView>
    </Surface>
  );
};
