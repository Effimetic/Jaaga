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
import { FontAwesome5 } from '@expo/vector-icons';
import { apiService } from '../services/apiService';

// Custom Dropdown Component
const CustomDropdown = ({ 
  value, 
  onValueChange, 
  items, 
  placeholder 
}: {
  value: string;
  onValueChange: (value: string) => void;
  items: { label: string; value: string }[];
  placeholder: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={styles.dropdownContainer}>
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => setIsOpen(!isOpen)}
        activeOpacity={0.7}
      >
        <Text style={styles.dropdownButtonText}>
          {items.find(item => item.value === value)?.label || placeholder}
        </Text>
        <FontAwesome5 
          name={isOpen ? 'chevron-up' : 'chevron-down'} 
          size={16} 
          color="#6B7280" 
        />
      </TouchableOpacity>
      
      {isOpen && (
        <View style={styles.dropdownList}>
          {items.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.dropdownItem,
                value === item.value && styles.dropdownItemSelected
              ]}
              onPress={() => {
                onValueChange(item.value);
                setIsOpen(false);
              }}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.dropdownItemText,
                value === item.value && styles.dropdownItemTextSelected
              ]}>
                {item.label}
              </Text>
              {value === item.value && (
                <FontAwesome5 name="check" size={14} color="#007AFF" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

// Button Component following UI guidelines
const Button = ({ 
  variant = 'primary', 
  onPress, 
  disabled = false, 
  children, 
  style 
}: {
  variant?: 'primary' | 'secondary' | 'tertiary';
  onPress: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  style?: any;
}) => {
  const buttonStyle = [
    styles.button,
    styles[`${variant}Button`],
    disabled && styles.disabledButton,
    style
  ];

  const textStyle = [
    styles.buttonText,
    styles[`${variant}ButtonText`],
    disabled && styles.disabledButtonText
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      {children}
    </TouchableOpacity>
  );
};

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
  const [currentStep, setCurrentStep] = useState(1);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (currentStep === 1 && formData.name.trim()) {
      setCurrentStep(2);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceedToNextStep = () => {
    if (currentStep === 1) {
      return formData.name.trim().length > 0;
    }
    return true;
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
        Alert.alert('Success', response.message || 'Boat added successfully!');
        // Navigate to boats list
        navigation.navigate('MyBoats');
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
    if (box.isWalkway) {
      // Render walkway as empty white space
      return (
        <TouchableOpacity
          key={`${row}-${col}`}
          style={[styles.gridBox, styles.walkwayBox]}
          onPress={() => toggleBox(row, col)}
          activeOpacity={0.7}
        />
      );
    }
    
    return (
      <TouchableOpacity
        key={`${row}-${col}`}
        style={[
          styles.gridBox,
          styles.seatBox,
          box.status === 'damaged' ? styles.damagedBox : null
        ]}
        onPress={() => toggleBox(row, col)}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.gridBoxText,
          styles.seatText,
          box.status === 'damaged' ? styles.damagedText : null
        ]}>
          {box.seatNumber || 'S'}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderSeatPreview = (seat: SeatChartData) => {
    if (seat.isWalkway) {
      // Show walkway as a visible, distinct element
      return (
        <View
          key={`${seat.row}-${seat.col}`}
          style={styles.walkwayPreview}
        >
          <Text style={styles.walkwayPreviewText}>W</Text>
        </View>
      );
    }
    
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
            activeOpacity={0.7}
          >
            <FontAwesome5 name="arrow-left" size={20} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add New Boat</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Step Indicator */}
        <View style={styles.stepIndicator}>
          <View style={[styles.step, currentStep >= 1 && styles.stepActive]}>
            <View style={[styles.stepCircle, currentStep >= 1 && styles.stepCircleActive]}>
              <Text style={[styles.stepNumber, currentStep >= 1 && styles.stepNumberActive]}>1</Text>
            </View>
            <Text style={[styles.stepLabel, currentStep >= 1 && styles.stepLabelActive]}>Boat Name</Text>
          </View>
          <View style={[styles.stepConnector, currentStep >= 2 && styles.stepConnectorActive]} />
          <View style={[styles.step, currentStep >= 2 && styles.stepActive]}>
            <View style={[styles.stepCircle, currentStep >= 2 && styles.stepCircleActive]}>
              <Text style={[styles.stepNumber, currentStep >= 2 && styles.stepNumberActive]}>2</Text>
            </View>
            <Text style={[styles.stepLabel, currentStep >= 2 && styles.stepLabelActive]}>Seating</Text>
          </View>
        </View>

        {/* Step 1: Boat Name */}
        {currentStep === 1 && (
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepTitle}>Add A Name</Text>
              <Text style={styles.stepDescription}>
                Give your boat a memorable name that passengers will recognize
              </Text>
            </View>
            
            <View style={styles.inputCard}>
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

            <Button
              variant="primary"
              onPress={nextStep}
              disabled={!canProceedToNextStep()}
              style={styles.fullWidthButton}
            >
              <Text style={styles.primaryButtonText}>Next: Seating Configuration</Text>
              <FontAwesome5 name="arrow-right" size={16} color="#FFFFFF" />
            </Button>
          </View>
        )}

        {/* Step 2: Seating Configuration */}
        {currentStep === 2 && (
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepTitle}>Seating Configuration</Text>
              <Text style={styles.stepDescription}>
                Choose how you want to configure the seating for your boat
              </Text>
            </View>

            <View style={styles.inputCard}>
              <Text style={styles.label}>Seating Configuration *</Text>
              <CustomDropdown
                value={formData.seating_type}
                onValueChange={(value) => handleInputChange('seating_type', value)}
                items={[
                  { label: 'Total Seat Count (Simple)', value: 'total' },
                  { label: 'Seat Chart (Advanced)', value: 'chart' },
                ]}
                placeholder="Select seating type"
              />
              <Text style={styles.helpText}>
                Total Seat Count: Simple numbering (1, 2, 3, etc.){'\n'}
                Seat Chart: Custom seat layout (A1, A2, B1, B2, etc.)
              </Text>
            </View>

            {/* Total Seats for Simple Mode */}
            {formData.seating_type === 'total' && (
              <View style={styles.inputCard}>
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
            )}

            {/* Seat Chart Configuration for Advanced Mode */}
            {formData.seating_type === 'chart' && (
              <View style={styles.inputCard}>
                <Text style={styles.label}>Seat Chart Configuration</Text>
                <TouchableOpacity
                  style={styles.configureButton}
                  onPress={() => setShowSeatChartModal(true)}
                  activeOpacity={0.7}
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
                    
                    {/* Legend */}
                    <View style={styles.legend}>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendBox, styles.availableSeat]} />
                        <Text style={styles.legendText}>Seat</Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendBox, styles.walkwayPreview]} />
                        <Text style={styles.legendText}>Walkway</Text>
                      </View>
                    </View>
                    
                    <Text style={styles.previewInfo}>
                      {seatChartData.flat().length} seats configured
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.stepActions}>
              <Button
                variant="secondary"
                onPress={prevStep}
                style={styles.flexButton}
              >
                <FontAwesome5 name="arrow-left" size={16} color="#6B7280" />
                <Text style={styles.secondaryButtonText}>Back</Text>
              </Button>

              <Button
                variant="primary"
                onPress={handleSubmit}
                disabled={isLoading}
                style={styles.flexButton}
              >
                {isLoading ? (
                  <Text style={styles.primaryButtonText}>Adding Boat...</Text>
                ) : (
                  <>
                    <FontAwesome5 name="plus" size={16} color="#FFFFFF" style={styles.buttonIcon} />
                    <Text style={styles.primaryButtonText}>Add Boat</Text>
                  </>
                )}
              </Button>
            </View>
          </View>
        )}
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
              activeOpacity={0.7}
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
                  <CustomDropdown
                    value={gridConfig.seatLabelType}
                    onValueChange={(value) => setGridConfig(prev => ({ ...prev, seatLabelType: value }))}
                    items={[
                      { label: 'Auto (A1, A2, B1, B2...)', value: 'auto' },
                      { label: 'Custom Labels', value: 'custom' },
                    ]}
                    placeholder="Select label type"
                  />
                </View>
              </View>

              <Button
                variant="primary"
                onPress={generateGrid}
                style={styles.fullWidthButton}
              >
                <FontAwesome5 name="th" size={16} color="#FFFFFF" />
                <Text style={styles.generateButtonText}>Generate Grid</Text>
              </Button>
            </View>

            {/* Grid Display */}
            {gridData.length > 0 && isGridMode && (
              <View style={styles.gridSection}>
                <View style={styles.gridHeader}>
                  <Text style={styles.gridTitle}>Interactive Grid</Text>
                  <View style={styles.gridBadge}>
                    <FontAwesome5 name="mouse-pointer" size={12} color="#F59E0B" />
                    <Text style={styles.gridBadgeText}>Click to Toggle</Text>
                  </View>
                </View>
                
                <View style={styles.gridInfo}>
                  <FontAwesome5 name="lightbulb" size={16} color="#007AFF" style={styles.gridInfoIcon} />
                  <Text style={styles.gridInfoText}>
                    Click boxes to toggle between seats and walkways. Green boxes are seats, empty spaces are walkways.
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
                  <Button
                    variant="secondary"
                    onPress={resetGrid}
                    style={styles.flexButton}
                  >
                    <FontAwesome5 name="undo" size={14} color="#6B7280" />
                    <Text style={styles.resetButtonText}>Reset Grid</Text>
                  </Button>
                  <Button
                    variant="primary"
                    onPress={finalizeSeatChart}
                    style={styles.flexButton}
                  >
                    <FontAwesome5 name="check" size={14} color="#FFFFFF" />
                    <Text style={styles.finalizeButtonText}>Finalize Chart</Text>
                  </Button>
                </View>
              </View>
            )}

            {/* Seat Chart Preview */}
            {seatChartData.length > 0 && !isGridMode && (
              <View style={styles.previewSection}>
                <View style={styles.previewHeader}>
                  <Text style={styles.previewTitle}>Final Seat Chart</Text>
                  <View style={styles.readyBadge}>
                    <FontAwesome5 name="check-circle" size={12} color="#10B981" />
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

                <Button
                  variant="secondary"
                  onPress={backToGrid}
                  style={styles.fullWidthButton}
                >
                  <FontAwesome5 name="arrow-left" size={14} color="#6B7280" />
                  <Text style={styles.backToGridButtonText}>Back to Grid</Text>
                </Button>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { 
    flex: 1, 
    backgroundColor: '#F9FAFB' // Surface color from guidelines
  },
  container: { 
    padding: 16 // Standard container padding from guidelines
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 4,
    height: 56, // Minimum height for touch targets from guidelines
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    minHeight: 44, // Accessibility touch target from guidelines
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20, // H2 from guidelines
    fontWeight: '600',
    color: '#111827', // Primary text color
  },
  placeholder: { 
    width: 44 // Match back button width for balance
  },

  // Step Indicator Styles
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  step: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB', // Secondary color
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280', // Secondary text color
  },
  stepActive: {
    backgroundColor: '#007AFF', // Primary color from guidelines
  },
  stepCircleActive: {
    backgroundColor: '#007AFF',
  },
  stepNumberActive: {
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  stepLabelActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  stepConnector: {
    width: 40,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginBottom: 8,
  },
  stepConnectorActive: {
    backgroundColor: '#007AFF',
  },

  // Step Content Styles
  stepContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  stepHeader: {
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 24, // H1 from guidelines
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16, // Body text from guidelines
    color: '#6B7280',
    lineHeight: 22,
  },
  stepActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 24,
  },

  // Input Card Styles
  inputCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  label: {
    fontSize: 14, // Base font size from guidelines
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    minHeight: 48, // Touch target from guidelines
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
    fontSize: 12, // Caption from guidelines
    color: '#6B7280',
    marginTop: 8,
    lineHeight: 16,
  },

  // Button Styles following UI guidelines
  button: {
    height: 48, // Touch target from guidelines
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    minHeight: 44, // Accessibility requirement
  },
  primaryButton: {
    backgroundColor: '#007AFF', // Primary color from guidelines
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#007AFF', // Primary color outline
  },
  tertiaryButton: {
    backgroundColor: 'transparent',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButtonText: {
    color: '#FFFFFF',
  },
  
  buttonIcon: {
    marginRight: 4,
  },
  
  // Utility button styles
  fullWidthButton: {
    width: '100%',
  },
  flexButton: {
    flex: 1,
  },

  // Custom Dropdown Styles
  dropdownContainer: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFF',
    overflow: 'hidden',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    minHeight: 48, // Touch target
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  dropdownList: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    minHeight: 44, // Touch target
  },
  dropdownItemSelected: {
    backgroundColor: '#F0F9FF',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#374151',
  },
  dropdownItemTextSelected: {
    fontWeight: '600',
    color: '#007AFF',
  },

  // Configure Button
  configureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    gap: 8,
    minHeight: 48, // Touch target
  },
  configureButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },

  // Chart Preview
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

  // Legend Styles
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    marginBottom: 8,
  },
  legendItem: {
    alignItems: 'center',
  },
  legendBox: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#6B7280',
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
    height: 56, // Touch target height
  },
  modalCloseButton: {
    padding: 8,
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18, // H3 from guidelines
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
    fontSize: 16, // H4 from guidelines
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
    minHeight: 44, // Touch target
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
    backgroundColor: '#FEF3C7', // Warning color background
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  gridBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#F59E0B', // Warning color
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
    minHeight: 44, // Touch target
    minWidth: 44,
  },
  seatBox: {
    backgroundColor: '#10B981', // Success color from guidelines
    borderColor: '#059669',
  },
  walkwayBox: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
  },
  damagedBox: {
    backgroundColor: '#EF4444', // Error color from guidelines
    borderColor: '#DC2626',
  },
  gridBoxText: {
    fontSize: 12,
    fontWeight: '600',
  },
  seatText: {
    color: '#FFF',
  },
  damagedText: {
    color: '#FFF',
  },
  gridActions: {
    flexDirection: 'row',
    gap: 12,
  },
  resetButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
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
    backgroundColor: '#D1FAE5', // Success color background
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  readyBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#065F46', // Success color text
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
    backgroundColor: '#10B981', // Success color
  },
  damagedSeat: {
    backgroundColor: '#EF4444', // Error color
  },
  seatPreviewText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  backToGridButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
  walkwayPreview: {
    width: 35,
    height: 35,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walkwayPreviewText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
  },

  // Picker container
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFF',
    overflow: 'hidden',
  },
});