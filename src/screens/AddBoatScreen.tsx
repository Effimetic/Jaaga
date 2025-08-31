import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  View
} from 'react-native';
import { Card, Input, Surface, Text } from '../components/catalyst';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { boatManagementService } from '../services/boatManagementService';
import { colors } from '../theme/theme';
import { BoatCreateRequest, Seat, SeatMap } from '../types';

interface BoatForm extends Omit<BoatCreateRequest, 'photos' | 'primary_photo'> {
  photos: string[];
  primary_photo?: string;
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
}

const AMENITIES = [
  { id: 'wifi', label: 'WiFi', icon: 'wifi' },
  { id: 'ac', label: 'Air Conditioning', icon: 'air-conditioner' },
  { id: 'tv', label: 'Entertainment', icon: 'television' },
  { id: 'charging', label: 'Phone Charging', icon: 'battery-charging' },
  { id: 'refreshments', label: 'Refreshments', icon: 'food-apple' },
  { id: 'restroom', label: 'Restroom', icon: 'human-male-female' },
  { id: 'luggage', label: 'Luggage Storage', icon: 'bag-suitcase' },
  { id: 'wheelchair', label: 'Wheelchair Access', icon: 'wheelchair-accessibility' },
];

export const AddBoatScreen: React.FC<{ navigation: any; route: any }> = ({ 
  navigation, 
  route 
}) => {
  const { user } = useAuth();
  const { boatId } = route.params || {};
  const isEditing = !!boatId;

  const [form, setForm] = useState<BoatForm>({
    name: '',
    registration: '',
    capacity: 50,
    seat_mode: 'CAPACITY',
    seat_map_json: null,
    amenities: [],
    description: '',
    photos: [],
    primary_photo: undefined,
    status: 'ACTIVE',
  });

  const [seatMapGrid, setSeatMapGrid] = useState<string[][]>([]);
  const [seatLabels, setSeatLabels] = useState<{[key: string]: string}>({});
  const [isGeneratingSeatMap, setIsGeneratingSeatMap] = useState(false);
  const [editingSeatLabel, setEditingSeatLabel] = useState<{row: number, col: number} | null>(null);
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [gridSize, setGridSize] = useState({ rows: 8, columns: 6 });
  
  const totalSteps = 5; // Basic Info, Photos, Seat Config, Amenities, Review

  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [seatMapPreview, setSeatMapPreview] = useState<SeatMap | null>(null);

  const loadBoatData = useCallback(async () => {
    if (!boatId) return;

    try {
      setLoading(true);
      const result = await boatManagementService.getBoat(boatId);
      
      if (result.success && result.data) {
        const boat = result.data;
        setForm({
          name: boat.name,
          registration: boat.registration || '',
          capacity: boat.capacity || 50,
          seat_mode: boat.seat_mode,
          seat_map_json: boat.seat_map_json,
          amenities: boat.amenities || [],
          description: (boat as any).description || '',
          photos: boat.photos || [],
          primary_photo: boat.primary_photo,
          status: boat.status || 'ACTIVE',
        });

        if (boat.seat_map_json) {
          setSeatMapPreview(boat.seat_map_json);
          if (boat.seat_map_json.layout) {
            setSeatMapGrid(boat.seat_map_json.layout);
          }
          
          // Load custom seat labels from existing seat map
          if (boat.seat_map_json.seats) {
            const labels: {[key: string]: string} = {};
            boat.seat_map_json.seats.forEach((seat: any) => {
              if (seat.label) {
                const key = `${seat.row - 1}-${seat.column - 1}`;
                labels[key] = seat.label;
              }
            });
            setSeatLabels(labels);
          }
        }
      } else {
        Alert.alert('Error', result.error || 'Failed to load boat data');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Failed to load boat:', error);
      Alert.alert('Error', 'Failed to load boat data');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [boatId, navigation]);

  useEffect(() => {
    if (isEditing) {
      loadBoatData();
    }
  }, [isEditing, loadBoatData]);

  const updateForm = (field: keyof BoatForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = async (source: 'camera' | 'gallery' = 'gallery') => {
    try {
      setUploadingPhoto(true);
      
      const image = await boatManagementService.pickImage(source);
      if (!image) return;

      const boatIdForUpload = boatId || `temp_${Date.now()}`;
      const uploadResult = await boatManagementService.uploadBoatPhoto(
        boatIdForUpload, 
        image.uri,
        'boat'
      );

      if (uploadResult.success && uploadResult.url) {
        const newPhotos = [...form.photos, uploadResult.url];
        updateForm('photos', newPhotos);
        
        // Set as primary photo if it's the first one
        if (!form.primary_photo) {
          updateForm('primary_photo', uploadResult.url);
        }
      } else {
        Alert.alert('Upload Failed', uploadResult.error || 'Failed to upload photo');
      }
    } catch (error) {
      console.error('Photo upload failed:', error);
      Alert.alert('Error', 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = (photoUrl: string) => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const newPhotos = form.photos.filter(photo => photo !== photoUrl);
            updateForm('photos', newPhotos);
            
            // Update primary photo if deleted
            if (form.primary_photo === photoUrl) {
              updateForm('primary_photo', newPhotos.length > 0 ? newPhotos[0] : undefined);
            }
          },
        },
      ]
    );
  };

  const handleSetPrimaryPhoto = (photoUrl: string) => {
    updateForm('primary_photo', photoUrl);
  };

  const handleAddPhoto = async () => {
    try {
      console.log('handleAddPhoto called');
      console.log('uploadingPhoto state:', uploadingPhoto);
      
      // Show photo source selection
      Alert.alert(
        'Add Photo',
        'Choose photo source',
        [
          { 
            text: 'Camera', 
            onPress: () => {
              console.log('Camera option selected');
              pickAndUploadPhoto('camera');
            }
          },
          { 
            text: 'Gallery', 
            onPress: () => {
              console.log('Gallery option selected');
              pickAndUploadPhoto('gallery');
            }
          },
          { 
            text: 'Cancel', 
            style: 'cancel',
            onPress: () => console.log('Photo picker cancelled')
          },
        ]
      );
      
      console.log('Alert.alert called successfully');
    } catch (error) {
      console.error('handleAddPhoto error:', error);
      Alert.alert('Error', 'Failed to add photo');
    }
  };

  const pickAndUploadPhoto = async (source: 'camera' | 'gallery') => {
    try {
      setUploadingPhoto(true);
      console.log('Starting photo picker for source:', source);
      
      // Pick image using the boat management service
      const image = await boatManagementService.pickImage(source);
      console.log('Image picker result:', image);
      
      if (!image) {
        console.log('No image selected or picker was cancelled');
        return;
      }

      // Generate a unique filename
      const boatIdForUpload = boatId || `temp_${Date.now()}`;
      const fileExtension = image.uri.split('.').pop() || 'jpg';
      const fileName = `boat_${boatIdForUpload}_${Date.now()}.${fileExtension}`;
      
      // Upload to Supabase storage
      const uploadResult = await boatManagementService.uploadBoatPhoto(
        boatIdForUpload, 
        image.uri,
        'boat',
        fileName
      );

      if (uploadResult.success && uploadResult.url) {
        const newPhotos = [...form.photos, uploadResult.url];
        updateForm('photos', newPhotos);
        
        // Set as primary if it's the first photo
        if (form.photos.length === 0) {
          updateForm('primary_photo', uploadResult.url);
        }
      } else {
        Alert.alert('Upload Failed', uploadResult.error || 'Failed to upload photo');
      }
    } catch (error) {
      console.error('Photo upload failed:', error);
      Alert.alert('Error', 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async (photoUrl: string) => {
    try {
      // Show confirmation dialog
      Alert.alert(
        'Delete Photo',
        'Are you sure you want to delete this photo?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                // Extract filename from URL for deletion
                const urlParts = photoUrl.split('/');
                const fileName = urlParts[urlParts.length - 1];
                const boatIdForDelete = boatId || `temp_${Date.now()}`;
                
                // Delete from Supabase storage
                const { error } = await supabase.storage
                  .from('boat-photos')
                  .remove([`boats/${boatIdForDelete}/${fileName}`]);
                
                if (error) {
                  console.error('Failed to delete photo from storage:', error);
                  // Continue with UI update even if storage deletion fails
                }
                
                // Update form state
                const newPhotos = form.photos.filter(photo => photo !== photoUrl);
                updateForm('photos', newPhotos);
                
                // If removing primary photo, set first remaining photo as primary
                if (form.primary_photo === photoUrl) {
                  updateForm('primary_photo', newPhotos.length > 0 ? newPhotos[0] : undefined);
                }
              } catch (error) {
                console.error('Photo deletion failed:', error);
                Alert.alert('Error', 'Failed to delete photo');
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Photo removal failed:', error);
      Alert.alert('Error', 'Failed to remove photo');
    }
  };

  const toggleAmenity = (amenityId: string) => {
    const currentAmenities = form.amenities || [];
    const amenity = AMENITIES.find(a => a.id === amenityId);
    if (!amenity) return;

    if (currentAmenities.includes(amenity.label)) {
      updateForm('amenities', currentAmenities.filter(a => a !== amenity.label));
    } else {
      updateForm('amenities', [...currentAmenities, amenity.label]);
    }
  };

  const generateSeatMap = () => {
    setIsGeneratingSeatMap(true);
    
    const grid: string[][] = [];
    
    for (let row = 0; row < gridSize.rows; row++) {
      grid[row] = [];
      for (let col = 0; col < gridSize.columns; col++) {
        grid[row][col] = 'empty'; // empty, seat, walkway
      }
    }
    
    setSeatMapGrid(grid);
    setForm(prev => ({ 
      ...prev, 
      seat_mode: 'SEATMAP',
      capacity: 0 // Will be calculated from selected seats
    }));
    setIsGeneratingSeatMap(false);
  };

  const toggleSeatPosition = (row: number, col: number) => {
    const newGrid = [...seatMapGrid];
    const currentValue = newGrid[row][col];
    
    // Cycle through: empty -> seat -> walkway -> empty
    if (currentValue === 'empty') {
      newGrid[row][col] = 'seat';
    } else if (currentValue === 'seat') {
      newGrid[row][col] = 'walkway';
    } else {
      newGrid[row][col] = 'empty';
    }
    
    setSeatMapGrid(newGrid);
    updateSeatMapFromGrid(newGrid);
  };

  const updateSeatMapFromGrid = (grid: string[][]) => {
    const seats: Seat[] = [];
    let seatNumber = 1;
    
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        if (grid[row][col] === 'seat') {
          const seatKey = `${row}-${col}`;
          const customLabel = seatLabels[seatKey];
          
          seats.push({
            id: `seat_${seatNumber}`,
            row: row + 1,
            column: col + 1,
            type: 'seat',
            available: true,
            price_multiplier: 1.0,
            label: customLabel || getSeatLabel(row, col),
          });
          seatNumber++;
        }
      }
    }

    const seatMap: SeatMap = {
      rows: grid.length,
      columns: grid[0].length,
      seats,
      layout: grid,
    };

    setSeatMapPreview(seatMap);
    setForm(prev => ({ 
      ...prev, 
      seat_map_json: seatMap,
      capacity: seats.length
    }));
  };

  const getSeatLabel = (row: number, col: number) => {
    const seatKey = `${row}-${col}`;
    const customLabel = seatLabels[seatKey];
    
    if (customLabel) {
      return customLabel;
    }
    
    // Auto-generate label with smart walkway handling
    let seatNumber = 1;
    for (let r = 0; r <= row; r++) {
      for (let c = 0; c < (r === row ? col : gridSize.columns); c++) {
        if (seatMapGrid[r] && seatMapGrid[r][c] === 'seat') {
          if (r === row && c === col) {
            return `A${seatNumber}`;
          }
          seatNumber++;
        }
      }
    }
    return `A${seatNumber}`;
  };



  // Wizard navigation functions
  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1: // Basic Info
        return form.name.trim() !== '';
      case 2: // Photos
        return true; // Photos are optional
      case 3: // Seat Configuration
        if (form.seat_mode === 'CAPACITY') {
          return form.capacity >= 1 && form.capacity <= 200;
        } else if (form.seat_mode === 'SEATMAP') {
          return form.capacity >= 1; // At least one seat in seat map
        }
        return false;
      case 4: // Amenities
        return true; // Amenities are optional
      case 5: // Review
        return true;
      default:
        return false;
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;

    // Validation
    if (!form.name.trim()) {
      Alert.alert('Validation Error', 'Boat name is required');
      return;
    }

    if (form.seat_mode === 'CAPACITY' && (form.capacity < 1 || form.capacity > 200)) {
      Alert.alert('Validation Error', 'Capacity must be between 1 and 200');
      return;
    }

    if (form.seat_mode === 'SEATMAP' && form.capacity < 1) {
      Alert.alert('Validation Error', 'Please create a seat map with at least one seat');
      return;
    }

    try {
      setLoading(true);

      // Get the owner ID for the current user
      const { data: ownerData, error: ownerError } = await supabase
        .from('owners')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (ownerError || !ownerData) {
        Alert.alert('Error', 'Owner account not found. Please contact support.');
        setLoading(false);
        return;
      }

      const boatData: BoatCreateRequest = {
        name: form.name.trim(),
        registration: form.registration?.trim() || undefined,
        capacity: form.capacity,
        seat_mode: form.seat_mode,
        seat_map_json: form.seat_map_json,
        amenities: form.amenities,
        description: form.description?.trim() || undefined,
        photos: form.photos,
        primary_photo: form.primary_photo,
        status: form.status,
      };

      let result;
      if (isEditing) {
        result = await boatManagementService.updateBoat(boatId, boatData);
      } else {
        result = await boatManagementService.createBoat(ownerData.id, boatData);
      }

      if (result.success) {
        Alert.alert(
          'Success',
          `Boat ${isEditing ? 'updated' : 'created'} successfully!`,
          [{ 
            text: 'OK', 
            onPress: () => {
              if (isEditing) {
                // For editing, go back to My Boats
                navigation.goBack();
              } else {
                // For creating, navigate to My Boats
                navigation.navigate('MyBoats');
              }
            }
          }]
        );
      } else {
        Alert.alert('Error', result.error || `Failed to ${isEditing ? 'update' : 'create'} boat`);
      }
    } catch (error) {
      console.error('Boat save failed:', error);
      Alert.alert('Error', `Failed to ${isEditing ? 'update' : 'create'} boat`);
    } finally {
      setLoading(false);
    }
  };

  const renderPhotoSection = () => (
    <View style={{ padding: 16 }}>
      <Card variant="elevated" padding="md">
        <Text variant="h6" color="primary" style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>
        Boat Photos
      </Text>
        <Text color="secondary" style={{ fontSize: 12, marginBottom: 16 }}>
        Add photos to showcase your boat. The first photo will be used as the main image.
      </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {form.photos.map((photo, index) => (
            <View key={index} style={{ position: 'relative', width: 80, height: 80, borderRadius: 8, overflow: 'hidden' }}>
              <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} />
            
            {/* Primary Photo Badge */}
            {form.primary_photo === photo && (
                <View style={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  backgroundColor: colors.success,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderBottomRightRadius: 4
                }}>
                  <Text style={{ color: 'white', fontSize: 10, fontWeight: '500' }}>Main</Text>
              </View>
            )}

            {/* Photo Actions */}
              <View style={{ 
                position: 'absolute', 
                top: 4, 
                right: 4, 
                flexDirection: 'row', 
                gap: 4 
              }}>
              {form.primary_photo !== photo && (
                <TouchableOpacity
                    style={{ 
                      backgroundColor: 'rgba(0,0,0,0.6)', 
                      borderRadius: 12, 
                      width: 24, 
                      height: 24, 
                      justifyContent: 'center', 
                      alignItems: 'center' 
                    }}
                  onPress={() => handleSetPrimaryPhoto(photo)}
                >
                    <MaterialCommunityIcons name="star-outline" size={12} color="white" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                  style={{ 
                    backgroundColor: 'rgba(0,0,0,0.6)', 
                    borderRadius: 12, 
                    width: 24, 
                    height: 24, 
                    justifyContent: 'center', 
                    alignItems: 'center' 
                  }}
                  onPress={() => handleRemovePhoto(photo)}
                >
                  <MaterialCommunityIcons name="delete" size={12} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Add Photo Button */}
        <TouchableOpacity
          onPress={handleAddPhoto}
          disabled={uploadingPhoto}
          style={{ 
            width: 80, 
            height: 80, 
            borderRadius: 8, 
            borderWidth: 2, 
            borderColor: '#d1d5db', 
            borderStyle: 'dashed', 
            justifyContent: 'center', 
            alignItems: 'center',
            backgroundColor: '#f9fafb',
            opacity: uploadingPhoto ? 0.5 : 1,
          }}
        >
          <MaterialCommunityIcons 
            name={uploadingPhoto ? "loading" : "camera-plus"} 
              size={24} 
              color={uploadingPhoto ? colors.primary : '#6b7280'} 
          />
        </TouchableOpacity>
      </View>
      </Card>
    </View>
  );

  const renderBasicInfo = () => (
    <View style={{ padding: 16 }}>
      <Card variant="elevated" padding="md">
        <Text variant="h6" color="primary" style={{ fontSize: 14, fontWeight: '600', marginBottom: 16 }}>
        Basic Information
      </Text>

        <View style={{ gap: 16 }}>
          <Input
        label="Boat Name *"
        value={form.name}
            onChangeText={(text: string) => updateForm('name', text)}
      />

          <Input
        label="Registration Number"
        value={form.registration}
            onChangeText={(text: string) => updateForm('registration', text)}
        placeholder="Optional"
      />



          <Input
        label="Description"
        value={form.description}
            onChangeText={(text: string) => updateForm('description', text)}
        multiline
        numberOfLines={3}
        placeholder="Describe your boat's features and services"
      />

          {/* Status Selection */}
          <View>
            <Text style={{ fontSize: 12, fontWeight: '500', marginBottom: 8, color: '#374151' }}>
              Boat Status *
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[
                { key: 'ACTIVE', label: 'Active', color: '#10b981' },
                { key: 'MAINTENANCE', label: 'Maintenance', color: '#f59e0b' },
                { key: 'INACTIVE', label: 'Inactive', color: '#ef4444' },
              ].map((status) => (
                <TouchableOpacity
                  key={status.key}
                  onPress={() => updateForm('status', status.key as any)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: form.status === status.key ? status.color : '#d1d5db',
                    backgroundColor: form.status === status.key ? status.color + '10' : '#ffffff',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{
                    fontSize: 12,
                    fontWeight: '500',
                    color: form.status === status.key ? status.color : '#6b7280',
                  }}>
                    {status.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Card>
    </View>
  );

  const renderSeatConfiguration = () => (
    <View style={{ padding: 16 }}>
      <Card variant="elevated" padding="md">
        <Text variant="h6" color="primary" style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>
        Seating Configuration
      </Text>
        <Text color="secondary" style={{ fontSize: 12, marginBottom: 16 }}>
        Choose how passengers select seats on your boat.
      </Text>

        {/* Grid Size Selection (always visible for SEATMAP mode) */}
        {form.seat_mode === 'SEATMAP' && (
          <View style={{ marginBottom: 16 }}>
            <Text variant="h6" color="primary" style={{ fontSize: 13, fontWeight: '500', marginBottom: 8 }}>
              Grid Size
            </Text>
            <Text color="secondary" style={{ fontSize: 11, marginBottom: 12 }}>
              Set the size of your seat map grid
            </Text>
            
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Rows"
                  value={gridSize.rows.toString()}
                  onChangeText={(text: string) => {
                    const rows = parseInt(text) || 1;
                    if (rows >= 1 && rows <= 20) {
                      setGridSize(prev => ({ ...prev, rows }));
                    }
                  }}
                  keyboardType="numeric"
                  placeholder="8"
                />
          </View>
              
              <View style={{ flex: 1 }}>
                <Input
                  label="Columns"
                  value={gridSize.columns.toString()}
                  onChangeText={(text: string) => {
                    const columns = parseInt(text) || 1;
                    if (columns >= 1 && columns <= 20) {
                      setGridSize(prev => ({ ...prev, columns }));
                    }
                  }}
                  keyboardType="numeric"
                  placeholder="6"
                />
              </View>
            </View>
            
            <View style={{ 
              padding: 12, 
              backgroundColor: '#f3f4f6', 
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12
            }}>
              <Text color="secondary" style={{ fontSize: 11 }}>
                Total Positions: {gridSize.rows} × {gridSize.columns} = {gridSize.rows * gridSize.columns}
            </Text>
          </View>

                        {/* Generate/Regenerate Button */}
          <TouchableOpacity
            onPress={generateSeatMap}
            style={{ 
              alignSelf: 'flex-start',
              backgroundColor: 'transparent',
              borderWidth: 1,
              borderColor: '#18181b',
              borderRadius: 8,
              paddingHorizontal: 16,
              paddingVertical: 12,
              flexDirection: 'row',
              alignItems: 'center',
              opacity: isGeneratingSeatMap ? 0.5 : 1,
            }}
            disabled={isGeneratingSeatMap}
          >
              <MaterialCommunityIcons name="auto-fix" size={16} color="#52525b" style={{ marginRight: 8 }} />
              <Text style={{ color: '#18181b', fontSize: 14, fontWeight: '500' }}>
                {isGeneratingSeatMap ? 'Generating...' : (seatMapGrid.length > 0 ? 'Regenerate Grid' : 'Generate Grid')}
              </Text>
          </TouchableOpacity>
        </View>
        )}

        {/* Capacity Input for CAPACITY mode */}
        {form.seat_mode === 'CAPACITY' && (
          <View style={{ marginBottom: 16 }}>
            <Input
              label="Passenger Capacity *"
              value={form.capacity.toString()}
              onChangeText={(text: string) => updateForm('capacity', parseInt(text) || 0)}
              keyboardType="numeric"
              placeholder="50"
            />
      </View>
        )}

        {/* Seat Mode Selection */}
        <View style={{ marginBottom: 16 }}>
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            padding: 12,
            backgroundColor: form.seat_mode === 'CAPACITY' ? '#52525b' : '#f9fafb',
            borderRadius: 8,
            marginBottom: 8
          }}>
            <TouchableOpacity 
              style={{ flex: 1 }}
              onPress={() => {
                setForm(prev => ({ ...prev, seat_mode: 'CAPACITY', seat_map_json: null }));
                setSeatMapGrid([]);
                setSeatMapPreview(null);
              }}
            >
              <Text variant="h6" color={form.seat_mode === 'CAPACITY' ? 'primary' : 'secondary'} 
                style={{ fontSize: 13, fontWeight: '500', marginBottom: 4, color: form.seat_mode === 'CAPACITY' ? '#ffffff' : undefined }}>
                Capacity Mode
              </Text>
              <Text color={form.seat_mode === 'CAPACITY' ? 'primary' : 'secondary'} 
                style={{ fontSize: 11, color: form.seat_mode === 'CAPACITY' ? '#ffffff' : undefined }}>
                Passengers buy tickets for a general seating area. Seats are assigned at boarding.
              </Text>
            </TouchableOpacity>
      </View>

          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            padding: 12,
            backgroundColor: form.seat_mode === 'SEATMAP' ? '#52525b' : '#f9fafb',
            borderRadius: 8,
            marginBottom: 12
          }}>
            <TouchableOpacity 
              style={{ flex: 1 }}
              onPress={() => {
                if (form.seat_mode !== 'SEATMAP') {
                  generateSeatMap();
                }
              }}
            >
              <Text variant="h6" color={form.seat_mode === 'SEATMAP' ? 'primary' : 'secondary'} 
                style={{ fontSize: 13, fontWeight: '500', marginBottom: 4, color: form.seat_mode === 'SEATMAP' ? '#ffffff' : undefined }}>
                Seat Map Mode
              </Text>
              <Text color={form.seat_mode === 'SEATMAP' ? 'primary' : 'secondary'} 
                style={{ fontSize: 11, color: form.seat_mode === 'SEATMAP' ? '#ffffff' : undefined }}>
                Passengers select specific seats. Create a custom seat layout.
              </Text>
            </TouchableOpacity>
          </View>


        </View>

        {/* Seat Map Grid Editor */}
        {form.seat_mode === 'SEATMAP' && seatMapGrid.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text variant="h6" color="primary" style={{ fontSize: 13, fontWeight: '500', marginBottom: 8 }}>
              Seat Map Editor
            </Text>
            <Text color="secondary" style={{ fontSize: 11, marginBottom: 12 }}>
              Tap to cycle: Empty → Seat → Walkway → Empty{'\n'}
              Tap ✏️ on seats to edit labels
            </Text>
            
            <View style={{ 
              backgroundColor: '#f9fafb', 
              padding: 12, 
              borderRadius: 8,
              alignItems: 'center'
            }}>
              <View style={{ gap: 2 }}>
                {seatMapGrid.map((row, rowIndex) => (
                  <View key={rowIndex} style={{ flexDirection: 'row', gap: 2 }}>
                    {row.map((cell, colIndex) => (
                      <View key={`${rowIndex}-${colIndex}`} style={{ position: 'relative' }}>
                        <TouchableOpacity
                          onPress={() => toggleSeatPosition(rowIndex, colIndex)}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 4,
                            backgroundColor: 
                              cell === 'seat' ? '#52525b' :
                              cell === 'walkway' ? '#fbbf24' :
                              '#e5e7eb',
                            justifyContent: 'center',
                            alignItems: 'center'
                          }}
                        >
                          {cell === 'seat' && (
                            <Text style={{ color: '#ffffff', fontSize: 8, fontWeight: 'bold' }}>
                              {getSeatLabel(rowIndex, colIndex)}
                            </Text>
                          )}
                          {cell === 'walkway' && (
                            <Text style={{ color: '#92400e', fontSize: 8 }}>W</Text>
                          )}
                        </TouchableOpacity>
                        
                        {/* Edit Label Button for Seats */}
                        {cell === 'seat' && (
                          <TouchableOpacity
                            onPress={() => setEditingSeatLabel({row: rowIndex, col: colIndex})}
                            style={{
                              position: 'absolute',
                              top: -2,
                              right: -2,
                              width: 12,
                              height: 12,
                              backgroundColor: '#3b82f6',
                              borderRadius: 6,
                              justifyContent: 'center',
                              alignItems: 'center'
                            }}
                          >
                            <Text style={{ color: '#ffffff', fontSize: 6, fontWeight: 'bold' }}>✏</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            </View>

            {/* Legend */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 12, height: 12, backgroundColor: '#e5e7eb', borderRadius: 2 }} />
                <Text color="secondary" style={{ fontSize: 10 }}>Empty</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 12, height: 12, backgroundColor: '#52525b', borderRadius: 2 }} />
                <Text color="secondary" style={{ fontSize: 10 }}>Seat</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 12, height: 12, backgroundColor: '#fbbf24', borderRadius: 2 }} />
                <Text color="secondary" style={{ fontSize: 10 }}>Walkway</Text>
              </View>
            </View>
          </View>
        )}

        {/* Capacity Display for SEATMAP mode */}
      {form.seat_mode === 'SEATMAP' && (
          <View style={{ 
            padding: 12, 
            backgroundColor: '#f3f4f6', 
            borderRadius: 8,
            marginTop: 8
          }}>
            <Text variant="h6" color="primary" style={{ fontSize: 13, fontWeight: '500', marginBottom: 8 }}>
              Passenger Capacity
              </Text>
            {seatMapPreview ? (
              <View>
                <Text color="secondary" style={{ fontSize: 11, marginBottom: 4 }}>
                  Total Seats: {seatMapPreview.seats.length}
                </Text>
                <Text color="secondary" style={{ fontSize: 11 }}>
                  Layout: {seatMapPreview.rows} rows × {seatMapPreview.columns} columns
                </Text>
              </View>
            ) : (
              <Text color="secondary" style={{ fontSize: 11 }}>
                Capacity will be determined by seat map selection
              </Text>
            )}
            </View>
          )}

        {/* Seat Label Edit Modal */}
        {editingSeatLabel && (
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <View style={{
              backgroundColor: '#ffffff',
              padding: 20,
              borderRadius: 12,
              width: '80%',
              maxWidth: 300
            }}>
              <Text variant="h6" color="primary" style={{ fontSize: 16, fontWeight: '600', marginBottom: 12 }}>
                Edit Seat Label
              </Text>
              
              <Input
                label="Seat Label"
                value={seatLabels[`${editingSeatLabel.row}-${editingSeatLabel.col}`] || getSeatLabel(editingSeatLabel.row, editingSeatLabel.col)}
                onChangeText={(text: string) => {
                  const seatKey = `${editingSeatLabel.row}-${editingSeatLabel.col}`;
                  setSeatLabels(prev => ({
                    ...prev,
                    [seatKey]: text
                  }));
                }}
                placeholder="Enter custom label"
                autoFocus
              />
              
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                <TouchableOpacity
                  onPress={() => setEditingSeatLabel(null)}
                  style={{ 
                    flex: 1,
                    backgroundColor: 'transparent',
                    borderWidth: 1,
                    borderColor: '#18181b',
                    borderRadius: 8,
                    paddingVertical: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#18181b', fontSize: 14, fontWeight: '500' }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setEditingSeatLabel(null)}
                  style={{ 
                    flex: 1,
                    backgroundColor: '#18181b',
                    borderRadius: 8,
                    paddingVertical: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '500' }}>
                    Save
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
        </View>
      )}
      </Card>
    </View>
  );

  const renderReview = () => (
    <View style={{ padding: 16 }}>
      <Card variant="elevated" padding="md">
        <Text variant="h6" color="primary" style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>
          Review Your Boat
        </Text>
        <Text color="secondary" style={{ fontSize: 12, marginBottom: 16 }}>
          Review all information before saving your boat.
        </Text>

        {/* Basic Information Review */}
        <View style={{ marginBottom: 16 }}>
          <Text variant="h6" color="primary" style={{ fontSize: 13, fontWeight: '500', marginBottom: 8 }}>
            Basic Information
          </Text>
          <View style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text color="secondary" style={{ fontSize: 11 }}>Name:</Text>
              <Text color="primary" style={{ fontSize: 11, fontWeight: '500' }}>{form.name}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text color="secondary" style={{ fontSize: 11 }}>Registration:</Text>
              <Text color="primary" style={{ fontSize: 11, fontWeight: '500' }}>{form.registration || 'Not provided'}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text color="secondary" style={{ fontSize: 11 }}>Capacity:</Text>
              <Text color="primary" style={{ fontSize: 11, fontWeight: '500' }}>{form.capacity} passengers</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text color="secondary" style={{ fontSize: 11 }}>Seat Mode:</Text>
              <Text color="primary" style={{ fontSize: 11, fontWeight: '500' }}>{form.seat_mode}</Text>
            </View>
            {form.description && (
              <View style={{ marginTop: 4 }}>
                <Text color="secondary" style={{ fontSize: 11, marginBottom: 2 }}>Description:</Text>
                <Text color="primary" style={{ fontSize: 11 }}>{form.description}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Photos Review */}
        <View style={{ marginBottom: 16 }}>
          <Text variant="h6" color="primary" style={{ fontSize: 13, fontWeight: '500', marginBottom: 8 }}>
            Photos
          </Text>
          <Text color="secondary" style={{ fontSize: 11 }}>
            {form.photos.length} photo{form.photos.length !== 1 ? 's' : ''} uploaded
            {form.primary_photo && ' • Primary photo selected'}
          </Text>
        </View>

        {/* Seat Configuration Review */}
        <View style={{ marginBottom: 16 }}>
          <Text variant="h6" color="primary" style={{ fontSize: 13, fontWeight: '500', marginBottom: 8 }}>
            Seat Configuration
          </Text>
          {form.seat_mode === 'CAPACITY' ? (
            <Text color="secondary" style={{ fontSize: 11 }}>
              Capacity-based seating • {form.capacity} passengers
            </Text>
          ) : (
            <View>
              <Text color="secondary" style={{ fontSize: 11, marginBottom: 4 }}>
                Seat map layout • {form.capacity} seats configured
              </Text>
              {seatMapPreview && (
                <Text color="secondary" style={{ fontSize: 11 }}>
                  Grid: {seatMapPreview.rows} rows × {seatMapPreview.columns} columns
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Amenities Review */}
        <View style={{ marginBottom: 16 }}>
          <Text variant="h6" color="primary" style={{ fontSize: 13, fontWeight: '500', marginBottom: 8 }}>
            Amenities
          </Text>
          {(form.amenities || []).length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
              {(form.amenities || []).map((amenity, index) => (
                <View key={index} style={{ 
                  paddingHorizontal: 8, 
                  paddingVertical: 4, 
                  backgroundColor: '#f3f4f6', 
                  borderRadius: 12 
                }}>
                  <Text color="secondary" style={{ fontSize: 10 }}>{amenity}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text color="secondary" style={{ fontSize: 11 }}>No amenities selected</Text>
          )}
        </View>
      </Card>
    </View>
  );

  const renderAmenities = () => (
    <View style={{ padding: 16 }}>
      <Card variant="elevated" padding="md">
        <Text variant="h6" color="primary" style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>
        Amenities & Features
      </Text>
        <Text color="secondary" style={{ fontSize: 12, marginBottom: 16 }}>
        Select the amenities available on your boat.
      </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {AMENITIES.map((amenity) => {
          const isSelected = form.amenities?.includes(amenity.label);
          return (
            <TouchableOpacity
              key={amenity.id}
                style={{
                  width: '30%',
                  alignItems: 'center',
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: isSelected ? '#52525b' : '#f3f4f6',
                  borderWidth: 1,
                  borderColor: isSelected ? '#52525b' : '#e5e7eb'
                }}
              onPress={() => toggleAmenity(amenity.id)}
            >
              <MaterialCommunityIcons
                name={amenity.icon as any}
                  size={20}
                  color={isSelected ? '#ffffff' : '#52525b'}
              />
              <Text
                  color={isSelected ? 'primary' : 'secondary'}
                  style={{
                    fontSize: 10,
                    marginTop: 6,
                    textAlign: 'center',
                    color: isSelected ? '#ffffff' : undefined
                  }}
              >
                {amenity.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      </Card>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderBasicInfo();
      case 2:
        return renderPhotoSection();
      case 3:
        return renderSeatConfiguration();
      case 4:
        return renderAmenities();
      case 5:
        return renderReview();
      default:
        return renderBasicInfo();
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return 'Basic Information';
      case 2:
        return 'Photos';
      case 3:
        return 'Seat Configuration';
      case 4:
        return 'Amenities';
      case 5:
        return 'Review & Save';
      default:
        return 'Basic Information';
    }
  };

  return (
    <Surface variant="default" style={{ flex: 1 }}>
    <KeyboardAvoidingView 
        style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
          style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
          {/* Header */}
          <View style={{ padding: 16, paddingTop: 20, backgroundColor: '#ffffff' }}>
            <Text variant="h4" color="primary" style={{ fontSize: 18, fontWeight: '600' }}>
              {isEditing ? 'Edit Boat' : 'Add New Boat'}
            </Text>
            <Text color="secondary" style={{ marginTop: 2, fontSize: 12 }}>
              {isEditing ? 'Update your boat information' : 'Create a new boat for your fleet'}
            </Text>
            
            {/* Progress Indicator */}
            <View style={{ marginTop: 16 }}>
              <View style={{ 
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: 8
              }}>
                <Text color="secondary" style={{ fontSize: 11 }}>
                  Step {currentStep} of {totalSteps} - {getStepTitle()}
                </Text>
                <Text color="secondary" style={{ fontSize: 11 }}>
                  {Math.round((currentStep / totalSteps) * 100)}%
                </Text>
              </View>
              <View style={{ 
                height: 4, 
                backgroundColor: '#e5e7eb', 
                borderRadius: 2,
                overflow: 'hidden'
              }}>
                <View style={{ 
                  height: '100%', 
                  width: `${(currentStep / totalSteps) * 100}%`, 
                  backgroundColor: '#52525b',
                  borderRadius: 2
                }} />
              </View>
            </View>
          </View>

          {renderCurrentStep()}

          <View style={{ height: 100 }} />
      </ScrollView>

        {/* Navigation Buttons */}
        <View style={{ 
          position: 'absolute', 
          bottom: 0, 
          left: 0, 
          right: 0, 
          backgroundColor: '#ffffff',
          padding: 16,
          borderTopWidth: 1,
          borderTopColor: '#f3f4f6'
        }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {currentStep > 1 ? (
          <TouchableOpacity
                onPress={prevStep}
                style={{ 
                  flex: 1,
                  backgroundColor: 'transparent',
                  borderWidth: 1,
                  borderColor: '#18181b',
                  borderRadius: 8,
                  paddingVertical: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: loading ? 0.5 : 1,
                }}
                disabled={loading}
              >
                <Text style={{ color: '#18181b', fontSize: 16, fontWeight: '500' }}>
                  Previous
                </Text>
              </TouchableOpacity>
            ) : (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
                style={{ 
                  flex: 1,
                  backgroundColor: 'transparent',
                  borderWidth: 1,
                  borderColor: '#18181b',
                  borderRadius: 8,
                  paddingVertical: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: loading ? 0.5 : 1,
                }}
            disabled={loading}
          >
            <Text style={{ color: '#18181b', fontSize: 16, fontWeight: '500' }}>
            Cancel
            </Text>
          </TouchableOpacity>
            )}
          
            {currentStep < totalSteps ? (
          <TouchableOpacity
                onPress={nextStep}
                style={{ 
                  flex: 1,
                  backgroundColor: '#18181b',
                  borderRadius: 8,
                  paddingVertical: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: (!validateCurrentStep() || loading) ? 0.5 : 1,
                }}
                disabled={!validateCurrentStep() || loading}
              >
                <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '500' }}>
                  Next
                </Text>
              </TouchableOpacity>
            ) : (
          <TouchableOpacity
            onPress={handleSave}
                style={{ 
                  flex: 1,
                  backgroundColor: '#18181b',
                  borderRadius: 8,
                  paddingVertical: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: loading ? 0.5 : 1,
                }}
            disabled={loading}
          >
                <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '500' }}>
                  {loading ? 'Saving...' : (isEditing ? 'Update Boat' : 'Add Boat')}
                </Text>
          </TouchableOpacity>
            )}
        </View>
        </View>
    </KeyboardAvoidingView>
      </Surface>
  );
};


