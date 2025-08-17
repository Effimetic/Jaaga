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
import { Picker } from '@react-native-picker/picker';
import { FontAwesome5 } from '@expo/vector-icons';
import { apiService } from '../services/apiService';
import { userService } from '../services/userService';

export default function RegisterScreen({ navigation }: { navigation: any }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    role: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const formatPhoneNumber = (value: string) => {
    let cleaned = value.replace(/\D/g, '');
    if (cleaned.length > 0) {
      if (cleaned.startsWith('960')) {
        cleaned = '+960 ' + cleaned.substring(3);
      } else if (cleaned.startsWith('0')) {
        cleaned = '+960 ' + cleaned.substring(1);
      } else {
        cleaned = '+960 ' + cleaned;
      }
    }
    return cleaned;
  };

  const handleRegister = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }

    if (!formData.phone.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    if (!formData.role) {
      Alert.alert('Error', 'Please select an account type');
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiService.register(formData);
      
      if (response.success) {
        Alert.alert(
          'Success',
          response.message || 'Account created successfully!',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login'),
            },
          ]
        );
      } else {
        Alert.alert('Error', response.error || 'Registration failed');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'public':
        return 'Book and pay for trips using MVR or USD. Payment required 24 hours before departure.';
      case 'agent':
        return 'Book on credit, no upfront payment required. Manage client bookings.';
      case 'owner':
        return 'Manage boats, configure seating, create schedules, and receive payments.';
      default:
        return 'Choose the account type that best describes your needs';
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
          <Text style={styles.headerTitle}>Create Account</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Icon and Title */}
        <View style={styles.titleSection}>
          <View style={styles.iconContainer}>
            <FontAwesome5 name="user-plus" size={40} color="#007AFF" />
          </View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Join Nashath Booking to start booking speed boat tickets
          </Text>
        </View>

        {/* Registration Form */}
        <View style={styles.form}>
          {/* Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <View style={styles.inputContainer}>
              <FontAwesome5 name="user" size={16} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="John Doe"
                value={formData.name}
                onChangeText={(value) => handleInputChange('name', value)}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Phone */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number *</Text>
            <View style={styles.inputContainer}>
              <FontAwesome5 name="phone" size={16} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="+960 123 4567"
                value={formData.phone}
                onChangeText={(value) => handleInputChange('phone', formatPhoneNumber(value))}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputContainer}>
              <FontAwesome5 name="envelope" size={16} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="john@example.com"
                value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <Text style={styles.helpText}>
              Optional - for booking confirmations and updates
            </Text>
          </View>

          {/* Role */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Account Type *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.role}
                onValueChange={(value) => handleInputChange('role', value)}
                style={styles.picker}
              >
                <Picker.Item label="Select account type" value="" />
                <Picker.Item label="Public User - Book tickets for personal travel" value="public" />
                <Picker.Item label="Entity/Agent - Book tickets on credit for clients" value="agent" />
                <Picker.Item label="Boat Owner - Manage boats and schedules" value="owner" />
              </Picker>
            </View>
          </View>

          {/* Role Description */}
          <View style={styles.infoBox}>
            <FontAwesome5 name="info-circle" size={16} color="#007AFF" style={styles.infoIcon} />
            <Text style={styles.infoText}>
              {getRoleDescription(formData.role)}
            </Text>
          </View>

          {/* Register Button */}
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, isLoading && styles.disabledButton]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <Text style={styles.buttonText}>Creating Account...</Text>
            ) : (
              <>
                <FontAwesome5 name="user-plus" size={16} color="#FFF" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Create Account</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginSection}>
            <Text style={styles.loginText}>
              Already have an account?{' '}
              <Text
                style={styles.loginLink}
                onPress={() => navigation.navigate('Login')}
              >
                Login here
              </Text>
            </Text>
          </View>
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
  helpText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
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

  infoBox: {
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
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },

  button: {
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  buttonIcon: {
    marginRight: 4,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },

  loginSection: {
    alignItems: 'center',
    marginTop: 8,
  },
  loginText: {
    fontSize: 14,
    color: '#6B7280',
  },
  loginLink: {
    color: '#007AFF',
    fontWeight: '600',
  },
});
