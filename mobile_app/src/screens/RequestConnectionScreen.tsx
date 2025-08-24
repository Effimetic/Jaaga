import React, { useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { apiService } from '../services/apiService';

export default function RequestConnectionScreen({ navigation }: { navigation: any }) {
  const [formData, setFormData] = useState({
    owner_phone: '',
    message: '',
    requested_credit_limit: '',
    preferred_currency: 'MVR',
    payment_terms_preference: '7',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ownerFound, setOwnerFound] = useState<any>(null);
  const [searchingOwner, setSearchingOwner] = useState(false);

  const searchOwnerByPhone = async (phone: string) => {
    if (phone.length < 7) {
      setOwnerFound(null);
      return;
    }

    setSearchingOwner(true);
    try {
      const response = await apiService.searchOwnerByPhone(phone);
      if (response.success) {
        setOwnerFound(response.data);
      } else {
        setOwnerFound(null);
      }
    } catch (error) {
      setOwnerFound(null);
    } finally {
      setSearchingOwner(false);
    }
  };

  const handlePhoneChange = (phone: string) => {
    setFormData(prev => ({ ...prev, owner_phone: phone }));
    
    // Debounced search
    setTimeout(() => {
      if (formData.owner_phone === phone) {
        searchOwnerByPhone(phone);
      }
    }, 500);
  };

  const handleSubmitRequest = async () => {
    if (!formData.owner_phone.trim()) {
      Alert.alert('Error', 'Please enter boat owner phone number');
      return;
    }

    if (!ownerFound) {
      Alert.alert('Error', 'Please enter a valid boat owner phone number');
      return;
    }

    if (!formData.requested_credit_limit || parseFloat(formData.requested_credit_limit) <= 0) {
      Alert.alert('Error', 'Please enter a valid credit limit request');
      return;
    }

    setIsSubmitting(true);

    try {
      const requestData = {
        owner_id: ownerFound.id,
        message: formData.message.trim(),
        requested_credit_limit: parseFloat(formData.requested_credit_limit),
        preferred_currency: formData.preferred_currency,
        payment_terms_preference: parseInt(formData.payment_terms_preference),
      };

      const response = await apiService.requestAgentConnection(requestData);
      
      if (response.success) {
        Alert.alert(
          'Request Sent',
          'Your connection request has been sent to the boat owner. You will be notified when they respond.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('Error', response.error || 'Failed to send connection request');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send connection request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <FontAwesome5 name="arrow-left" size={20} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Request Connection</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Icon and Title */}
        <View style={styles.titleSection}>
          <View style={styles.iconContainer}>
            <FontAwesome5 name="handshake" size={40} color="#007AFF" />
          </View>
          <Text style={styles.title}>Connect with Boat Owner</Text>
          <Text style={styles.subtitle}>
            Request a credit connection to book tickets on behalf of your clients
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Owner Phone Search */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Boat Owner Phone Number *</Text>
            <View style={styles.inputContainer}>
              <FontAwesome5 name="phone" size={16} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="+960 123 4567"
                value={formData.owner_phone}
                onChangeText={handlePhoneChange}
                keyboardType="phone-pad"
              />
              {searchingOwner && (
                <FontAwesome5 name="spinner" size={16} color="#007AFF" style={styles.searchingIcon} />
              )}
            </View>
            
            {ownerFound && (
              <View style={styles.ownerFoundCard}>
                <FontAwesome5 name="check-circle" size={16} color="#10B981" />
                <View style={styles.ownerInfo}>
                  <Text style={styles.ownerName}>{ownerFound.brand_name || ownerFound.name}</Text>
                  <Text style={styles.ownerContact}>{ownerFound.name} • {ownerFound.phone}</Text>
                </View>
              </View>
            )}
            
            {formData.owner_phone.length >= 7 && !ownerFound && !searchingOwner && (
              <View style={styles.ownerNotFoundCard}>
                <FontAwesome5 name="exclamation-triangle" size={16} color="#F59E0B" />
                <Text style={styles.notFoundText}>
                  No boat owner found with this phone number
                </Text>
              </View>
            )}
          </View>

          {/* Credit Limit Request */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Requested Credit Limit *</Text>
            <View style={styles.inputContainer}>
              <FontAwesome5 name="credit-card" size={16} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={formData.requested_credit_limit}
                onChangeText={(value) => setFormData(prev => ({ ...prev, requested_credit_limit: value }))}
                keyboardType="numeric"
              />
              <Text style={styles.currencyText}>{formData.preferred_currency}</Text>
            </View>
            <Text style={styles.helpText}>
              Amount you would like to book on credit before payment
            </Text>
          </View>

          {/* Currency Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Preferred Currency</Text>
            <View style={styles.currencyButtons}>
              <TouchableOpacity
                style={[
                  styles.currencyButton,
                  formData.preferred_currency === 'MVR' && styles.selectedCurrencyButton
                ]}
                onPress={() => setFormData(prev => ({ ...prev, preferred_currency: 'MVR' }))}
              >
                <Text style={[
                  styles.currencyButtonText,
                  formData.preferred_currency === 'MVR' && styles.selectedCurrencyButtonText
                ]}>
                  MVR
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.currencyButton,
                  formData.preferred_currency === 'USD' && styles.selectedCurrencyButton
                ]}
                onPress={() => setFormData(prev => ({ ...prev, preferred_currency: 'USD' }))}
              >
                <Text style={[
                  styles.currencyButtonText,
                  formData.preferred_currency === 'USD' && styles.selectedCurrencyButtonText
                ]}>
                  USD
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Payment Terms Preference */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Preferred Payment Terms</Text>
            <View style={styles.termsButtons}>
              {['7', '14', '30'].map(days => (
                <TouchableOpacity
                  key={days}
                  style={[
                    styles.termsButton,
                    formData.payment_terms_preference === days && styles.selectedTermsButton
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, payment_terms_preference: days }))}
                >
                  <Text style={[
                    styles.termsButtonText,
                    formData.payment_terms_preference === days && styles.selectedTermsButtonText
                  ]}>
                    Net {days} days
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.helpText}>
              How many days you prefer to have for payment after booking
            </Text>
          </View>

          {/* Message */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Message to Owner (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Introduce yourself and explain why you'd like to connect..."
              value={formData.message}
              onChangeText={(value) => setFormData(prev => ({ ...prev, message: value }))}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Text style={styles.helpText}>
              A brief introduction can help the owner understand your business
            </Text>
          </View>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <FontAwesome5 name="info-circle" size={16} color="#007AFF" style={styles.infoIcon} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>About Connection Requests</Text>
              <Text style={styles.infoText}>
                • The boat owner will review your request{'\n'}
                • They can approve, reject, or modify your terms{'\n'}
                • You'll be notified of their decision{'\n'}
                • Once approved, you can book tickets on credit
              </Text>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton, 
              (!ownerFound || isSubmitting) && styles.disabledButton
            ]}
            onPress={handleSubmitRequest}
            disabled={!ownerFound || isSubmitting}
          >
            {isSubmitting ? (
              <Text style={styles.submitButtonText}>Sending Request...</Text>
            ) : (
              <>
                <FontAwesome5 name="paper-plane" size={16} color="#FFF" />
                <Text style={styles.submitButtonText}>Send Connection Request</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FA' },
  container: { padding: 16 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  placeholder: { width: 36 },

  titleSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },

  form: { gap: 20 },

  inputGroup: { gap: 8 },
  label: {
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingVertical: 12,
  },
  currencyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 8,
  },
  searchingIcon: {
    marginLeft: 8,
  },
  helpText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 16,
  },

  ownerFoundCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    gap: 8,
  },
  ownerInfo: {
    flex: 1,
  },
  ownerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
    marginBottom: 2,
  },
  ownerContact: {
    fontSize: 12,
    color: '#047857',
  },

  ownerNotFoundCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    gap: 8,
  },
  notFoundText: {
    fontSize: 12,
    color: '#92400E',
  },

  currencyButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  currencyButton: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  selectedCurrencyButton: {
    backgroundColor: '#F0F9FF',
    borderColor: '#007AFF',
  },
  currencyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  selectedCurrencyButtonText: {
    color: '#007AFF',
  },

  termsButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  termsButton: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  selectedTermsButton: {
    backgroundColor: '#F0F9FF',
    borderColor: '#007AFF',
  },
  termsButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  selectedTermsButtonText: {
    color: '#007AFF',
  },

  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  infoIcon: {
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 16,
  },

  submitButton: {
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
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});