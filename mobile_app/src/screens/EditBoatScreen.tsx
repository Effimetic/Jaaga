import React, { useEffect, useState } from 'react';
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

interface Boat {
  id: number;
  name: string;
  seating_type: string;
  total_seats: number;
  seating_chart: string | null;
  is_active: boolean;
}

export default function EditBoatScreen({ navigation, route }: { navigation: any; route: any }) {
  const [boat, setBoat] = useState<Boat | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    seating_type: 'total',
    total_seats: '',
    seating_chart: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const { boatId } = route.params || {};

  useEffect(() => {
    loadBoat();
  }, [boatId]);

  const loadBoat = async () => {
    try {
      setIsLoading(true);
      
      if (!boatId) {
        Alert.alert('Error', 'No boat selected');
        navigation.goBack();
        return;
      }

      const response = await apiService.getBoatById(boatId);
      if (response.success) {
        const boatData = response.data;
        setBoat(boatData);
        setFormData({
          name: boatData.name,
          seating_type: boatData.seating_type,
          total_seats: boatData.total_seats.toString(),
          seating_chart: boatData.seating_chart,
        });
      } else {
        Alert.alert('Error', 'Failed to load boat details');
        navigation.goBack();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load boat');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a boat name');
      return;
    }

    if (!formData.total_seats || parseInt(formData.total_seats) < 1) {
      Alert.alert('Error', 'Please enter a valid number of seats');
      return;
    }

    setIsSaving(true);

    try {
      const boatData = {
        name: formData.name.trim(),
        seating_type: formData.seating_type,
        total_seats: parseInt(formData.total_seats),
        seating_chart: formData.seating_chart
      };

      const response = await apiService.updateBoat(boatId, boatData);
      
      if (response.success) {
        Alert.alert(
          'Success',
          response.message || 'Boat updated successfully!',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('Error', response.error || 'Failed to update boat');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <FontAwesome5 name="spinner" size={24} color="#007AFF" />
          <Text style={styles.loadingText}>Loading boat details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!boat) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Boat not found</Text>
        </View>
      </SafeAreaView>
    );
  }

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
          <Text style={styles.headerTitle}>Edit Boat</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Icon and Title */}
        <View style={styles.titleSection}>
          <View style={styles.iconContainer}>
            <FontAwesome5 name="edit" size={40} color="#007AFF" />
          </View>
          <Text style={styles.title}>Edit {boat.name}</Text>
          <Text style={styles.subtitle}>
            Update your boat details and configuration
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Boat Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Boat Name *</Text>
            <View style={styles.inputContainer}>
              <FontAwesome5 name="ship" size={16} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g., Speed Boat 1, Ocean Express"
                value={formData.name}
                onChangeText={(value) => handleInputChange('name', value)}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Seating Type */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Seating Configuration *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.seating_type}
                onValueChange={(value) => handleInputChange('seating_type', value)}
                style={styles.picker}
              >
                <Picker.Item label="Total Seat Count (Simple)" value="total" />
                <Picker.Item label="Seat Chart (Advanced)" value="chart" />
              </Picker>
            </View>
            <Text style={styles.helpText}>
              Total Seat Count: Simple numbering (1, 2, 3, etc.){'\n'}
              Seat Chart: Custom seat layout (A1, A2, B1, B2, etc.)
            </Text>
          </View>

          {/* Total Seats */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Total Number of Seats *</Text>
            <View style={styles.inputContainer}>
              <FontAwesome5 name="chair" size={16} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g., 20"
                value={formData.total_seats}
                onChangeText={(value) => handleInputChange('total_seats', value)}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Seat Chart Info */}
          {formData.seating_type === 'chart' && (
            <View style={styles.infoBox}>
              <FontAwesome5 name="info-circle" size={16} color="#007AFF" style={styles.infoIcon} />
              <Text style={styles.infoText}>
                Advanced seat chart configuration is available in the web interface. 
                Changes here will update the total seat count only.
              </Text>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, isSaving && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isSaving}
          >
            {isSaving ? (
              <Text style={styles.buttonText}>Updating Boat...</Text>
            ) : (
              <>
                <FontAwesome5 name="save" size={16} color="#FFF" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Update Boat</Text>
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
  helpText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 16,
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

  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
  },
});