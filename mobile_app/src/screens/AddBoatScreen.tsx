import React, { useState } from 'react';
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
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { FontAwesome5 } from '@expo/vector-icons';
import { apiService } from '../services/apiService';

interface SeatGridBox {
  isWalkway: boolean;
  row: number;
  col: number;
  seatNumber?: string;
  available?: boolean;
  status?: string;
}

interface SeatChartData {
  number: string;
  available: boolean;
  status: string;
  row: number;
  col: number;
  isWalkway: boolean;
}

export default function AddBoatScreen({ navigation }: { navigation: any }) {
  const [formData, setFormData] = useState({
    name: '',
    seating_type: 'total',
    total_seats: '',
    seating_chart: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showSeatChartModal, setShowSeatChartModal] = useState(false);
  const [gridConfig, setGridConfig] = useState({
    rows: 4,
    seatsPerRow: 5,
    seatLabelType: 'auto'
  });
  const [gridData, setGridData] = useState<SeatGridBox[][]>([]);
  const [seatChartData, setSeatChartData] = useState<SeatChartData[][]>([]);
  const [isGridMode, setIsGridMode] = useState(true);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const generateGrid = () => {
    const { rows, seatsPerRow } = gridConfig;
    
    if (rows < 1 || seatsPerRow < 1) {
      Alert.alert('Error', 'Please enter valid numbers for rows and columns (minimum 1)');
      return;
    }
    
    if (rows > 50 || seatsPerRow > 50) {
      Alert.alert('Error', 'Please enter reasonable numbers for rows and columns (maximum 50 each)');
      return;
    }

    const newGridData: SeatGridBox[][] = [];
    
    for (let row = 0; row < rows; row++) {
      const rowData: SeatGridBox[] = [];
      for (let col = 0; col < seatsPerRow; col++) {
        rowData.push({
          isWalkway: false,
          row: row,
          col: col
        });
      }
      newGridData.push(rowData);
    }
    
    setGridData(newGridData);
    setIsGridMode(true);
    setSeatChartData([]);
  };

  const toggleBox = (row: number, col: number) => {
    const newGridData = [...gridData];
    const box = newGridData[row][col];
    
    if (box.isWalkway) {
      // Converting walkway to seat
      box.isWalkway = false;
      configureSeat(row, col, newGridData);
    } else {
      // Converting seat to walkway
      box.isWalkway = true;
      delete box.seatNumber;
      delete box.available;
      delete box.status;
    }
    
    setGridData(newGridData);
  };

  const configureSeat = (row: number, col: number, gridDataToUpdate: SeatGridBox[][]) => {
    const { seatLabelType } = gridConfig;
    let seatNumber: string;
    
    if (seatLabelType === 'auto') {
      seatNumber = String.fromCharCode(65 + row) + (col + 1); // A1, A2, B1, B2, etc.
    } else {
      // For mobile, we'll use a simple prompt-like approach
      seatNumber = `${row + 1}${col + 1}`;
    }
    
    gridDataToUpdate[row][col].seatNumber = seatNumber;
    gridDataToUpdate[row][col].available = true;
    gridDataToUpdate[row][col].status = 'available';
  };

  const finalizeSeatChart = () => {
    const newSeatChartData: SeatChartData[][] = [];
    let seatCount = 0;
    
    // Count total seats (non-walkway boxes)
    for (let row = 0; row < gridData.length; row++) {
      for (let col = 0; col < gridData[row].length; col++) {
        if (!gridData[row][col].isWalkway) {
          seatCount++;
        }
      }
    }
    
    if (seatCount === 0) {
      Alert.alert('Error', 'Please select at least one seat (non-walkway box)');
      return;
    }
    
    for (let row = 0; row < gridData.length; row++) {
      const rowData: SeatChartData[] = [];
      
      for (let col = 0; col < gridData[row].length; col++) {
        const box = gridData[row][col];
        
        if (!box.isWalkway) {
          const seatNumber = box.seatNumber || String.fromCharCode(65 + row) + (col + 1);
          const seatStatus = box.status || 'available';
          const seatAvailable = box.available !== undefined ? box.available : true;
          
          rowData.push({
            number: seatNumber,
            available: seatAvailable,
            status: seatStatus,
            row: row,
            col: col,
            isWalkway: false
          });
        }
      }
      
      if (rowData.length > 0) {
        newSeatChartData.push(rowData);
      }
    }
    
    setSeatChartData(newSeatChartData);
    setIsGridMode(false);
    
    // Update total seats count
    setFormData(prev => ({ ...prev, total_seats: seatCount.toString() }));
  };

  const resetGrid = () => {
    Alert.alert(
      'Reset Grid',
      'Are you sure you want to reset the grid? This will clear all walkway selections.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: generateGrid }
      ]
    );
  };

  const backToGrid = () => {
    setIsGridMode(true);
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

    // For seat chart, validate that chart is finalized
    if (formData.seating_type === 'chart' && (!seatChartData || seatChartData.length === 0)) {
      Alert.alert('Error', 'Please finalize the seat chart first');
      return;
    }

    setIsLoading(true);

    try {
      const boatData = {
        name: formData.name.trim(),
        seating_type: formData.seating_type,
        total_seats: parseInt(formData.total_seats),
        seating_chart: formData.seating_type === 'chart' ? JSON.stringify({
          gridData: gridData,
          seatChartData: seatChartData,
          isGridMode: isGridMode
        }) : null
      };

      const response = await apiService.createBoat(boatData);
      
      if (response.success) {
        Alert.alert(
          'Success',
          response.message || 'Boat added successfully!',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('Error', response.error || 'Failed to add boat');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderGridBox = (box: SeatGridBox, row: number, col: number) => {
    return (
      <TouchableOpacity
        key={`${row}-${col}`}
        style={[
          styles.gridBox,
          box.isWalkway ? styles.walkwayBox : styles.seatBox,
          box.status === 'damaged' ? styles.damagedBox : null
        ]}
        onPress={() => toggleBox(row, col)}
      >
        <Text style={[
          styles.gridBoxText,
          box.isWalkway ? styles.walkwayText : styles.seatText,
          box.status === 'damaged' ? styles.damagedText : null
        ]}>
          {box.isWalkway ? 'W' : (box.seatNumber || 'S')}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderSeatPreview = (seat: SeatChartData) => {
    return (
      <View
        key={`${seat.row}-${seat.col}`}
        style={[
          styles.seatPreview,
          seat.status === 'damaged' ? styles.damagedSeat : styles.availableSeat
        ]}
      >
        <Text style={styles.seatPreviewText}>{seat.number}</Text>
      </View>
    );
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
          <Text style={styles.headerTitle}>Add New Boat</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Icon and Title */}
        <View style={styles.titleSection}>
          <View style={styles.iconContainer}>
            <FontAwesome5 name="ship" size={40} color="#007AFF" />
          </View>
          <Text style={styles.title}>Add New Boat</Text>
          <Text style={styles.subtitle}>
            Register a new boat to your fleet
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
                editable={formData.seating_type !== 'chart'}
              />
            </View>
            {formData.seating_type === 'chart' && (
              <Text style={styles.helpText}>
                Total seats will be calculated automatically from the seat chart
              </Text>
            )}
          </View>

          {/* Seat Chart Configuration */}
          {formData.seating_type === 'chart' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Seat Chart Configuration</Text>
              <TouchableOpacity
                style={styles.configureButton}
                onPress={() => setShowSeatChartModal(true)}
              >
                <FontAwesome5 name="th" size={16} color="#007AFF" />
                <Text style={styles.configureButtonText}>
                  {seatChartData.length > 0 ? 'Edit Seat Chart' : 'Configure Seat Chart'}
                </Text>
              </TouchableOpacity>
              
              {seatChartData.length > 0 && (
                <View style={styles.chartPreview}>
                  <Text style={styles.previewTitle}>Seat Chart Preview</Text>
                  <View style={styles.previewGrid}>
                    {seatChartData.map((row, rowIndex) => (
                      <View key={rowIndex} style={styles.previewRow}>
                        {row.map((seat) => renderSeatPreview(seat))}
                      </View>
                    ))}
                  </View>
                  <Text style={styles.previewInfo}>
                    {seatChartData.flat().length} seats configured
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, isLoading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <Text style={styles.buttonText}>Adding Boat...</Text>
            ) : (
              <>
                <FontAwesome5 name="plus" size={16} color="#FFF" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Add Boat</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Seat Chart Configuration Modal */}
      <Modal
        visible={showSeatChartModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSeatChartModal(false)}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowSeatChartModal(false)}
            >
              <FontAwesome5 name="times" size={20} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Seat Chart Configuration</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Grid Configuration */}
            <View style={styles.configSection}>
              <Text style={styles.configTitle}>Grid Configuration</Text>
              
              <View style={styles.configRow}>
                <View style={styles.configItem}>
                  <Text style={styles.configLabel}>Rows</Text>
                  <TextInput
                    style={styles.configInput}
                    value={gridConfig.rows.toString()}
                    onChangeText={(value) => setGridConfig(prev => ({ ...prev, rows: parseInt(value) || 1 }))}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.configItem}>
                  <Text style={styles.configLabel}>Columns</Text>
                  <TextInput
                    style={styles.configInput}
                    value={gridConfig.seatsPerRow.toString()}
                    onChangeText={(value) => setGridConfig(prev => ({ ...prev, seatsPerRow: parseInt(value) || 1 }))}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.configItem}>
                <Text style={styles.configLabel}>Seat Label Type</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={gridConfig.seatLabelType}
                    onValueChange={(value) => setGridConfig(prev => ({ ...prev, seatLabelType: value }))}
                    style={styles.picker}
                  >
                    <Picker.Item label="Auto (A1, A2, B1, B2...)" value="auto" />
                    <Picker.Item label="Custom Labels" value="custom" />
                  </Picker>
                </View>
              </View>

              <TouchableOpacity style={styles.generateButton} onPress={generateGrid}>
                <FontAwesome5 name="th" size={16} color="#FFF" />
                <Text style={styles.generateButtonText}>Generate Grid</Text>
              </TouchableOpacity>
            </View>

            {/* Grid Display */}
            {gridData.length > 0 && isGridMode && (
              <View style={styles.gridSection}>
                <View style={styles.gridHeader}>
                  <Text style={styles.gridTitle}>Interactive Grid</Text>
                  <View style={styles.gridBadge}>
                    <FontAwesome5 name="mouse-pointer" size={12} color="#856404" />
                    <Text style={styles.gridBadgeText}>Click to Toggle</Text>
                  </View>
                </View>
                
                <View style={styles.gridInfo}>
                  <FontAwesome5 name="lightbulb" size={16} color="#007AFF" style={styles.gridInfoIcon} />
                  <Text style={styles.gridInfoText}>
                    Click boxes to toggle between seats and walkways. Green = Seat, Yellow = Walkway.
                  </Text>
                </View>

                <View style={styles.gridDisplay}>
                  {gridData.map((row, rowIndex) => (
                    <View key={rowIndex} style={styles.gridRow}>
                      {row.map((box, colIndex) => renderGridBox(box, rowIndex, colIndex))}
                    </View>
                  ))}
                </View>

                <View style={styles.gridActions}>
                  <TouchableOpacity style={styles.resetButton} onPress={resetGrid}>
                    <FontAwesome5 name="undo" size={14} color="#6B7280" />
                    <Text style={styles.resetButtonText}>Reset Grid</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.finalizeButton} onPress={finalizeSeatChart}>
                    <FontAwesome5 name="check" size={14} color="#FFF" />
                    <Text style={styles.finalizeButtonText}>Finalize Chart</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Seat Chart Preview */}
            {seatChartData.length > 0 && !isGridMode && (
              <View style={styles.previewSection}>
                <View style={styles.previewHeader}>
                  <Text style={styles.previewTitle}>Final Seat Chart</Text>
                  <View style={styles.readyBadge}>
                    <FontAwesome5 name="check-circle" size={12} color="#0F5132" />
                    <Text style={styles.readyBadgeText}>Ready</Text>
                  </View>
                </View>
                
                <View style={styles.previewInfo}>
                  <FontAwesome5 name="check-circle" size={16} color="#10B981" style={styles.previewInfoIcon} />
                  <Text style={styles.previewInfoText}>
                    This is how your boat seating will appear to passengers (walkways hidden).
                  </Text>
                </View>

                <View style={styles.seatChartDisplay}>
                  {seatChartData.map((row, rowIndex) => (
                    <View key={rowIndex} style={styles.previewRow}>
                      {row.map((seat) => renderSeatPreview(seat))}
                    </View>
                  ))}
                </View>

                <TouchableOpacity style={styles.backToGridButton} onPress={backToGrid}>
                  <FontAwesome5 name="arrow-left" size={14} color="#6B7280" />
                  <Text style={styles.backToGridButtonText}>Back to Grid</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
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

  configureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  configureButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },

  chartPreview: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  previewGrid: {
    alignItems: 'center',
    marginBottom: 8,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 4,
    gap: 2,
  },
  previewInfo: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
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

  // Configuration section
  configSection: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  configTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  configRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  configItem: {
    flex: 1,
  },
  configLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  configInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: '#FFF',
  },
  generateButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  generateButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Grid section
  gridSection: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  gridHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  gridTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  gridBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  gridBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#856404',
  },
  gridInfo: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  gridInfoIcon: {
    marginTop: 2,
  },
  gridInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  gridDisplay: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 4,
    gap: 2,
  },
  gridBox: {
    width: 35,
    height: 35,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatBox: {
    backgroundColor: '#10B981',
    borderColor: '#059669',
  },
  walkwayBox: {
    backgroundColor: '#F59E0B',
    borderColor: '#D97706',
  },
  damagedBox: {
    backgroundColor: '#EF4444',
    borderColor: '#DC2626',
  },
  gridBoxText: {
    fontSize: 12,
    fontWeight: '600',
  },
  seatText: {
    color: '#FFF',
  },
  walkwayText: {
    color: '#FFF',
  },
  damagedText: {
    color: '#FFF',
  },
  gridActions: {
    flexDirection: 'row',
    gap: 12,
  },
  resetButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  resetButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
  finalizeButton: {
    flex: 1,
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  finalizeButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Preview section
  previewSection: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1E7DD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  readyBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#0F5132',
  },
  previewInfo: {
    flexDirection: 'row',
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  previewInfoIcon: {
    marginTop: 2,
  },
  previewInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#065F46',
    lineHeight: 18,
  },
  seatChartDisplay: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  seatPreview: {
    width: 35,
    height: 35,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 1,
  },
  availableSeat: {
    backgroundColor: '#10B981',
  },
  damagedSeat: {
    backgroundColor: '#EF4444',
  },
  seatPreviewText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  backToGridButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  backToGridButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
});