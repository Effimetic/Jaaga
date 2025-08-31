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

interface BankAccount {
  id?: string;
  owner_id: string;
  currency: string;
  bank_name: string;
  account_name: string;
  account_no: string;
  iban?: string;
  active: boolean;
}

export const BankAccountSettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [formData, setFormData] = useState<BankAccount>({
    owner_id: '',
    currency: 'MVR',
    bank_name: '',
    account_name: '',
    account_no: '',
    iban: '',
    active: true
  });

  const loadBankAccounts = useCallback(async () => {
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

      setFormData(prev => ({ ...prev, owner_id: ownerData.id }));

      // Load bank accounts
      const { data: accounts, error } = await supabase
        .from('owner_bank_accounts')
        .select('*')
        .eq('owner_id', ownerData.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to load bank accounts:', error);
        Alert.alert('Error', 'Failed to load bank accounts');
        return;
      }

      setBankAccounts(accounts || []);
    } catch (error) {
      console.error('Failed to load bank accounts:', error);
      Alert.alert('Error', 'Failed to load bank accounts');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadBankAccounts();
  }, [loadBankAccounts]);

  const handleSave = async () => {
    if (!formData.owner_id) return;

    if (!formData.bank_name.trim()) {
      Alert.alert('Validation Error', 'Bank name is required');
      return;
    }

    if (!formData.account_name.trim()) {
      Alert.alert('Validation Error', 'Account name is required');
      return;
    }

    if (!formData.account_no.trim()) {
      Alert.alert('Validation Error', 'Account number is required');
      return;
    }

    try {
      setSaving(true);

      const accountData = {
        owner_id: formData.owner_id,
        currency: formData.currency,
        bank_name: formData.bank_name.trim(),
        account_name: formData.account_name.trim(),
        account_no: formData.account_no.trim(),
        iban: formData.iban?.trim() || null,
        active: formData.active
      };

      let result;
      if (editingAccount?.id) {
        // Update existing account
        const { data, error } = await supabase
          .from('owner_bank_accounts')
          .update({
            ...accountData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingAccount.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Create new account
        const { data, error } = await supabase
          .from('owner_bank_accounts')
          .insert([accountData])
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      Alert.alert('Success', `Bank account ${editingAccount?.id ? 'updated' : 'created'} successfully!`);
      
      // Reset form
      setFormData({
        owner_id: formData.owner_id,
        currency: 'MVR',
        bank_name: '',
        account_name: '',
        account_no: '',
        iban: '',
        active: true
      });
      setShowAddForm(false);
      setEditingAccount(null);
      
      // Reload data
      loadBankAccounts();
    } catch (error: any) {
      console.error('Failed to save bank account:', error);
      Alert.alert('Error', error.message || 'Failed to save bank account');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (account: BankAccount) => {
    setEditingAccount(account);
    setFormData(account);
    setShowAddForm(true);
  };

  const handleDelete = (account: BankAccount) => {
    Alert.alert(
      'Delete Bank Account',
      `Are you sure you want to delete "${account.bank_name} - ${account.account_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('owner_bank_accounts')
                .delete()
                .eq('id', account.id);

              if (error) throw error;

              Alert.alert('Success', 'Bank account deleted successfully!');
              loadBankAccounts();
            } catch (error: any) {
              console.error('Failed to delete bank account:', error);
              Alert.alert('Error', error.message || 'Failed to delete bank account');
            }
          }
        }
      ]
    );
  };

  const handleCancel = () => {
    setFormData({
      owner_id: formData.owner_id,
      currency: 'MVR',
      bank_name: '',
      account_name: '',
      account_no: '',
      iban: '',
      active: true
    });
    setShowAddForm(false);
    setEditingAccount(null);
  };

  const renderBankAccountItem = (account: BankAccount) => (
    <TouchableOpacity 
      key={account.id} 
      style={{ marginBottom: 12 }}
    >
      <Card variant="elevated" padding="none">
        {/* Account Header */}
        <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#f4f4f5' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text variant="h6" color="primary" style={{ 
                fontSize: 14, 
                fontWeight: '600', 
                marginBottom: 4,
                color: '#18181b'
              }}>
                {account.bank_name}
              </Text>
              <Text color="secondary" style={{ 
                fontSize: 11, 
                color: '#71717a'
              }}>
                {account.account_name} • {account.currency}
              </Text>
            </View>

            {/* Status Badge */}
            <View style={{ 
              backgroundColor: account.active ? '#10b98120' : '#ef444420',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center'
            }}>
              <MaterialCommunityIcons
                name={account.active ? 'check-circle' : 'pause-circle'}
                size={12}
                color={account.active ? '#10b981' : '#ef4444'}
                style={{ marginRight: 4 }}
              />
              <Text style={{ 
                color: account.active ? '#10b981' : '#ef4444', 
                fontSize: 10, 
                fontWeight: '500' 
              }}>
                {account.active ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        </View>

        {/* Account Details */}
        <View style={{ padding: 12 }}>
          <View style={{ flexDirection: 'row', marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
              <MaterialCommunityIcons name="credit-card" size={14} color="#71717a" />
              <Text color="secondary" style={{ fontSize: 11, marginLeft: 4, color: '#71717a' }}>
                {account.account_no}
              </Text>
            </View>

            {account.iban && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons name="bank" size={14} color="#71717a" />
                <Text color="secondary" style={{ fontSize: 11, marginLeft: 4, color: '#71717a' }}>
                  {account.iban}
                </Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <TouchableOpacity
              onPress={() => handleEdit(account)}
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
              onPress={() => handleDelete(account)}
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
            Bank Accounts
          </Text>
          <Text color="secondary" style={{ 
            marginTop: 4, 
            fontSize: 14,
            color: '#71717a'
          }}>
            Manage bank accounts for settlements and transfers
          </Text>
        </View>

        {/* Add Bank Account Button - Top Right Corner */}
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
                {editingAccount ? 'Edit Bank Account' : 'Add New Bank Account'}
              </Text>
              
              <View style={{ gap: 16 }}>
                <Input
                  label="Bank Name *"
                  value={formData.bank_name}
                  onChangeText={(text: string) => 
                    setFormData(prev => ({ ...prev, bank_name: text }))
                  }
                  placeholder="e.g., Bank of Maldives"
                  style={{
                    fontSize: 14,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                  }}
                />

                <Input
                  label="Account Name *"
                  value={formData.account_name}
                  onChangeText={(text: string) => 
                    setFormData(prev => ({ ...prev, account_name: text }))
                  }
                  placeholder="e.g., Company Name"
                  style={{
                    fontSize: 14,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                  }}
                />

                <Input
                  label="Account Number *"
                  value={formData.account_no}
                  onChangeText={(text: string) => 
                    setFormData(prev => ({ ...prev, account_no: text }))
                  }
                  placeholder="e.g., 1234567890"
                  style={{
                    fontSize: 14,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                  }}
                />

                <Input
                  label="IBAN (Optional)"
                  value={formData.iban || ''}
                  onChangeText={(text: string) => 
                    setFormData(prev => ({ ...prev, iban: text }))
                  }
                  placeholder="e.g., MV12345678901234567890"
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

        {/* Bank Accounts List */}
        <View style={{ padding: 16, paddingTop: showAddForm ? 0 : 8 }}>
          {bankAccounts.length === 0 ? (
            <Card variant="outlined" padding="md">
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <MaterialCommunityIcons
                  name="bank"
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
                  No Bank Accounts
                </Text>
                <Text color="secondary" style={{ 
                  fontSize: 14, 
                  textAlign: 'center',
                  color: '#71717a'
                }}>
                  Add your first bank account to enable bank transfer payments
                </Text>
              </View>
            </Card>
          ) : (
            bankAccounts.map(renderBankAccountItem)
          )}
        </View>
      </ScrollView>
    </Surface>
  );
};
