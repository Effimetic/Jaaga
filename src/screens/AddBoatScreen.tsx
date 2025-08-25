import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    Button,
    RadioButton,
    Surface,
    Text,
    TextInput
} from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { boatManagementService } from '../services/boatManagementService';
import { colors, spacing, theme } from '../theme/theme';
import { BoatCreateRequest, SeatMap } from '../types';

interface BoatForm extends Omit<BoatCreateRequest, 'photos' | 'primary_photo'> {
  photos: string[];
  primary_photo?: string;
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
  });

  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [seatMapPreview, setSeatMapPreview] = useState<SeatMap | null>(null);

  useEffect(() => {
    if (isEditing) {
      loadBoatData();
    }
  }, [isEditing, boatId]);

  const loadBoatData = async () => {
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
          description: boat.description || '',
          photos: boat.photos || [],
          primary_photo: boat.primary_photo,
        });

        if (boat.seat_map_json) {
          setSeatMapPreview(boat.seat_map_json);
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
  };

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
    if (form.seat_mode === 'CAPACITY') {
      setSeatMapPreview(null);
      updateForm('seat_map_json', null);
      return;
    }

    const seatMap = boatManagementService.generateDefaultSeatMap(form.capacity, 'double');
    setSeatMapPreview(seatMap);
    updateForm('seat_map_json', seatMap);
  };

  const handleSave = async () => {
    if (!user?.id) return;

    // Validation
    if (!form.name.trim()) {
      Alert.alert('Validation Error', 'Boat name is required');
      return;
    }

    if (form.capacity < 1 || form.capacity > 200) {
      Alert.alert('Validation Error', 'Capacity must be between 1 and 200');
      return;
    }

    try {
      setLoading(true);

      const boatData: BoatCreateRequest = {
        name: form.name.trim(),
        registration: form.registration.trim() || undefined,
        capacity: form.capacity,
        seat_mode: form.seat_mode,
        seat_map_json: form.seat_map_json,
        amenities: form.amenities,
        description: form.description.trim() || undefined,
        photos: form.photos,
        primary_photo: form.primary_photo,
      };

      let result;
      if (isEditing) {
        result = await boatManagementService.updateBoat(boatId, boatData);
      } else {
        result = await boatManagementService.createBoat(user.id, boatData);
      }

      if (result.success) {
        Alert.alert(
          'Success',
          `Boat ${isEditing ? 'updated' : 'created'} successfully!`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
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
    <Surface style={styles.section} elevation={1}>
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Boat Photos
      </Text>
      <Text variant="bodySmall" style={styles.sectionSubtitle}>
        Add photos to showcase your boat. The first photo will be used as the main image.
      </Text>

      <View style={styles.photosContainer}>
        {form.photos.map((photo, index) => (
          <View key={index} style={styles.photoItem}>
            <Image source={{ uri: photo }} style={styles.photoImage} />
            
            {/* Primary Photo Badge */}
            {form.primary_photo === photo && (
              <View style={styles.primaryBadge}>
                <Text style={styles.primaryText}>Main</Text>
              </View>
            )}

            {/* Photo Actions */}
            <View style={styles.photoActions}>
              {form.primary_photo !== photo && (
                <TouchableOpacity
                  style={styles.photoAction}
                  onPress={() => handleSetPrimaryPhoto(photo)}
                >
                  <MaterialCommunityIcons name="star-outline" size={16} color="white" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.photoAction}
                onPress={() => handleDeletePhoto(photo)}
              >
                <MaterialCommunityIcons name="delete" size={16} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Add Photo Button */}
        <TouchableOpacity
          style={styles.addPhotoButton}
          onPress={() => {
            Alert.alert(
              'Add Photo',
              'Choose photo source',
              [
                { text: 'Camera', onPress: () => handlePhotoUpload('camera') },
                { text: 'Gallery', onPress: () => handlePhotoUpload('gallery') },
                { text: 'Cancel', style: 'cancel' },
              ]
            );
          }}
          disabled={uploadingPhoto}
        >
          <MaterialCommunityIcons 
            name={uploadingPhoto ? "loading" : "camera-plus"} 
            size={32} 
            color={theme.colors.primary} 
          />
          <Text variant="bodySmall" style={styles.addPhotoText}>
            {uploadingPhoto ? 'Uploading...' : 'Add Photo'}
          </Text>
        </TouchableOpacity>
      </View>
    </Surface>
  );

  const renderBasicInfo = () => (
    <Surface style={styles.section} elevation={1}>
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Basic Information
      </Text>

      <TextInput
        label="Boat Name *"
        value={form.name}
        onChangeText={(text) => updateForm('name', text)}
        mode="outlined"
        style={styles.input}
        error={!form.name.trim()}
      />

      <TextInput
        label="Registration Number"
        value={form.registration}
        onChangeText={(text) => updateForm('registration', text)}
        mode="outlined"
        style={styles.input}
        placeholder="Optional"
      />

      <TextInput
        label="Passenger Capacity *"
        value={form.capacity.toString()}
        onChangeText={(text) => updateForm('capacity', parseInt(text) || 0)}
        mode="outlined"
        style={styles.input}
        keyboardType="numeric"
        error={form.capacity < 1 || form.capacity > 200}
      />

      <TextInput
        label="Description"
        value={form.description}
        onChangeText={(text) => updateForm('description', text)}
        mode="outlined"
        style={styles.input}
        multiline
        numberOfLines={3}
        placeholder="Describe your boat's features and services"
      />
    </Surface>
  );

  const renderSeatConfiguration = () => (
    <Surface style={styles.section} elevation={1}>
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Seating Configuration
      </Text>
      <Text variant="bodySmall" style={styles.sectionSubtitle}>
        Choose how passengers select seats on your boat.
      </Text>

      <RadioButton.Group
        onValueChange={(value) => updateForm('seat_mode', value)}
        value={form.seat_mode}
      >
        <View style={styles.radioOption}>
          <View style={styles.radioContent}>
            <View style={styles.radioInfo}>
              <Text variant="titleSmall">Capacity Mode</Text>
              <Text variant="bodySmall" style={styles.radioDescription}>
                Passengers buy tickets for a general seating area. Seats are assigned at boarding.
              </Text>
            </View>
            <RadioButton value="CAPACITY" />
          </View>
        </View>

        <View style={styles.radioOption}>
          <View style={styles.radioContent}>
            <View style={styles.radioInfo}>
              <Text variant="titleSmall">Seat Map Mode</Text>
              <Text variant="bodySmall" style={styles.radioDescription}>
                Passengers can select specific seats from a visual seat map.
              </Text>
            </View>
            <RadioButton value="SEATMAP" />
          </View>
        </View>
      </RadioButton.Group>

      {form.seat_mode === 'SEATMAP' && (
        <View style={styles.seatMapSection}>
          <Button
            mode="outlined"
            onPress={generateSeatMap}
            style={styles.generateButton}
            icon="auto-fix"
          >
            {seatMapPreview ? 'Regenerate' : 'Generate'} Seat Map
          </Button>

          {seatMapPreview && (
            <View style={styles.seatMapPreview}>
              <Text variant="bodyMedium" style={styles.previewTitle}>
                Seat Map Preview ({seatMapPreview.seats.length} seats)
              </Text>
              <View style={styles.previewGrid}>
                {/* Simple grid preview */}
                <Text variant="bodySmall" style={styles.previewNote}>
                  Rows: {seatMapPreview.rows} | Columns: {seatMapPreview.columns}
                </Text>
              </View>
            </View>
          )}
        </View>
      )}
    </Surface>
  );

  const renderAmenities = () => (
    <Surface style={styles.section} elevation={1}>
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Amenities & Features
      </Text>
      <Text variant="bodySmall" style={styles.sectionSubtitle}>
        Select the amenities available on your boat.
      </Text>

      <View style={styles.amenitiesGrid}>
        {AMENITIES.map((amenity) => {
          const isSelected = form.amenities?.includes(amenity.label);
          return (
            <TouchableOpacity
              key={amenity.id}
              style={[
                styles.amenityItem,
                isSelected && styles.amenityItemSelected
              ]}
              onPress={() => toggleAmenity(amenity.id)}
            >
              <MaterialCommunityIcons
                name={amenity.icon as any}
                size={24}
                color={isSelected ? theme.colors.primary : theme.colors.onSurfaceVariant}
              />
              <Text
                variant="bodySmall"
                style={[
                  styles.amenityLabel,
                  isSelected && { color: theme.colors.primary }
                ]}
              >
                {amenity.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </Surface>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderPhotoSection()}
        {renderBasicInfo()}
        {renderSeatConfiguration()}
        {renderAmenities()}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Save Button */}
      <Surface style={styles.footer} elevation={3}>
        <View style={styles.footerContent}>
          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            style={styles.footerButton}
            disabled={loading}
          >
            Cancel
          </Button>
          
          <Button
            mode="contained"
            onPress={handleSave}
            style={styles.footerButton}
            loading={loading}
            disabled={loading}
          >
            {isEditing ? 'Update Boat' : 'Add Boat'}
          </Button>
        </View>
      </Surface>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    margin: spacing.md,
    borderRadius: 12,
    padding: spacing.md,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  sectionSubtitle: {
    opacity: 0.7,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  input: {
    marginBottom: spacing.md,
  },
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  photoItem: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  primaryBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: colors.success,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderBottomRightRadius: 4,
  },
  primaryText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  photoActions: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  photoAction: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 2,
  },
  addPhotoButton: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  addPhotoText: {
    color: theme.colors.primary,
    textAlign: 'center',
  },
  radioOption: {
    marginBottom: spacing.sm,
  },
  radioContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  radioInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  radioDescription: {
    opacity: 0.7,
    marginTop: spacing.xs,
    lineHeight: 16,
  },
  seatMapSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
  },
  generateButton: {
    marginBottom: spacing.md,
  },
  seatMapPreview: {
    padding: spacing.md,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 8,
  },
  previewTitle: {
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  previewGrid: {
    alignItems: 'center',
  },
  previewNote: {
    opacity: 0.7,
    textAlign: 'center',
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  amenityItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  amenityItemSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryContainer,
  },
  amenityLabel: {
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  bottomSpacing: {
    height: 80,
  },
  footer: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
  },
  footerContent: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  footerButton: {
    flex: 1,
  },
});
