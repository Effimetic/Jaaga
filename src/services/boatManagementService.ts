import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { supabase } from '../config/supabase';
import {
  ApiResponse,
  Boat,
  BoatCreateRequest,
  BoatUpdateRequest,
  SeatMap
} from '../types';

export interface PhotoUploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

export interface BoatWithPhotos extends Boat {
  photos: string[];
  primary_photo?: string;
  registration?: string;
  amenities?: string[];
}

export class BoatManagementService {
  private static instance: BoatManagementService;

  public static getInstance(): BoatManagementService {
    if (!BoatManagementService.instance) {
      BoatManagementService.instance = new BoatManagementService();
    }
    return BoatManagementService.instance;
  }

  /**
   * Request camera/gallery permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: galleryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      return cameraStatus === 'granted' && galleryStatus === 'granted';
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  }

  /**
   * Pick image from camera or gallery
   */
  async pickImage(source: 'camera' | 'gallery' = 'gallery'): Promise<ImagePicker.ImagePickerAsset | null> {
    try {
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        Alert.alert('Permissions Required', 'Please grant camera and photo permissions to upload images.');
        return null;
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9], // Good aspect ratio for boats
        quality: 0.8,
      };

      let result: ImagePicker.ImagePickerResult;
      
      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (!result.canceled && result.assets.length > 0) {
        return result.assets[0];
      }

      return null;
    } catch (error) {
      console.error('Image picker failed:', error);
      Alert.alert('Error', 'Failed to pick image');
      return null;
    }
  }

  /**
   * Process and optimize image
   */
  async processImage(imageUri: string, maxWidth = 1200): Promise<string> {
    try {
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          { resize: { width: maxWidth } },
        ],
        {
          compress: 0.8,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      return manipulatedImage.uri;
    } catch (error) {
      console.error('Image processing failed:', error);
      return imageUri; // Return original if processing fails
    }
  }

  /**
   * Upload image to Supabase Storage
   */
  async uploadBoatPhoto(
    boatId: string, 
    imageUri: string, 
    type: 'boat' | 'logo' = 'boat'
  ): Promise<PhotoUploadResult> {
    try {
      // Process image
      const processedUri = await this.processImage(imageUri);
      
      // Generate unique filename
      const timestamp = Date.now();
      const fileExtension = 'jpg';
      const fileName = `${type}s/${boatId}/${timestamp}.${fileExtension}`;
      
      // Read file as base64
      const fileContent = await FileSystem.readAsStringAsync(processedUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('boat-images')
        .upload(fileName, fileContent, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('boat-images')
        .getPublicUrl(fileName);

      return {
        success: true,
        url: urlData.publicUrl,
        path: fileName,
      };

    } catch (error: any) {
      console.error('Photo upload failed:', error);
      return {
        success: false,
        error: error.message || 'Photo upload failed',
      };
    }
  }

  /**
   * Delete image from Supabase Storage
   */
  async deleteBoatPhoto(imagePath: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from('boat-images')
        .remove([imagePath]);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Photo deletion failed:', error);
      return false;
    }
  }

  /**
   * Create new boat
   */
  async createBoat(ownerId: string, boatData: BoatCreateRequest): Promise<ApiResponse<Boat>> {
    try {
      const { data, error } = await supabase
        .from('boats')
        .insert([{
          owner_id: ownerId,
          name: boatData.name,
          registration: boatData.registration,
          capacity: boatData.capacity,
          seat_mode: boatData.seat_mode,
          seat_map_json: boatData.seat_map_json,
          amenities: boatData.amenities || [],
          description: boatData.description,
          photos: boatData.photos || [],
          primary_photo: boatData.primary_photo,
          status: 'ACTIVE',
        }])
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      console.error('Boat creation failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to create boat',
        data: null,
      };
    }
  }

  /**
   * Update existing boat
   */
  async updateBoat(boatId: string, boatData: BoatUpdateRequest): Promise<ApiResponse<Boat>> {
    try {
      const { data, error } = await supabase
        .from('boats')
        .update({
          name: boatData.name,
          registration: boatData.registration,
          capacity: boatData.capacity,
          seat_mode: boatData.seat_mode,
          seat_map_json: boatData.seat_map_json,
          amenities: boatData.amenities,
          description: boatData.description,
          photos: boatData.photos,
          primary_photo: boatData.primary_photo,
          updated_at: new Date().toISOString(),
        })
        .eq('id', boatId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      console.error('Boat update failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to update boat',
        data: null,
      };
    }
  }

  /**
   * Delete boat (soft delete)
   */
  async deleteBoat(boatId: string): Promise<ApiResponse<boolean>> {
    try {
      // Check if boat has active schedules
      const { data: schedules } = await supabase
        .from('schedules')
        .select('id')
        .eq('boat_id', boatId)
        .eq('status', 'ACTIVE')
        .limit(1);

      if (schedules && schedules.length > 0) {
        return {
          success: false,
          error: 'Cannot delete boat with active schedules',
          data: false,
        };
      }

      // Soft delete the boat
      const { error } = await supabase
        .from('boats')
        .update({
          status: 'INACTIVE',
          updated_at: new Date().toISOString(),
        })
        .eq('id', boatId);

      if (error) throw error;

      return {
        success: true,
        data: true,
      };
    } catch (error: any) {
      console.error('Boat deletion failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete boat',
        data: false,
      };
    }
  }

  /**
   * Get boats for owner
   */
  async getOwnerBoats(ownerId: string): Promise<ApiResponse<BoatWithPhotos[]>> {
    try {
      const { data, error } = await supabase
        .from('boats')
        .select('*')
        .eq('owner_id', ownerId)
        .neq('status', 'INACTIVE')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Type assertion since photos is already part of the boat record
      const boatsWithPhotos: BoatWithPhotos[] = (data || []).map(boat => ({
        ...boat,
        photos: boat.photos || [],
      }));

      return {
        success: true,
        data: boatsWithPhotos,
      };
    } catch (error: any) {
      console.error('Failed to fetch boats:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch boats',
        data: [],
      };
    }
  }

  /**
   * Get boat by ID
   */
  async getBoat(boatId: string): Promise<ApiResponse<BoatWithPhotos>> {
    try {
      const { data, error } = await supabase
        .from('boats')
        .select('*')
        .eq('id', boatId)
        .single();

      if (error) throw error;

      const boatWithPhotos: BoatWithPhotos = {
        ...data,
        photos: data.photos || [],
      };

      return {
        success: true,
        data: boatWithPhotos,
      };
    } catch (error: any) {
      console.error('Failed to fetch boat:', error);
      return {
        success: false,
        error: error.message || 'Boat not found',
        data: null,
      };
    }
  }

  /**
   * Generate default seat map
   */
  generateDefaultSeatMap(capacity: number, layout: 'single' | 'double' = 'double'): SeatMap {
    const seatsPerRow = layout === 'single' ? 2 : 4;
    const rows = Math.ceil(capacity / seatsPerRow);
    const seats = [];
    const layoutMatrix = [];

    let seatCounter = 1;

    for (let row = 0; row < rows; row++) {
      const rowSeats = [];
      const rowLayout = [];

      for (let col = 0; col < seatsPerRow; col++) {
        if (seatCounter <= capacity) {
          // Skip middle seats for aisle in double layout
          if (layout === 'double' && (col === 1 || col === 2)) {
            rowLayout.push('');
            if (col === 2) continue; // Skip the actual seat creation for aisle
          }

          const seatId = `${String.fromCharCode(65 + row)}${col < seatsPerRow / 2 ? col + 1 : col}`;
          
          seats.push({
            id: seatId,
            row,
            column: col,
            type: 'regular',
            available: true,
            price_multiplier: 1.0,
          });

          rowLayout.push(seatId);
          seatCounter++;
        } else {
          rowLayout.push('');
        }
      }

      layoutMatrix.push(rowLayout);
      rowSeats.forEach(seat => seats.push(seat));
    }

    return {
      rows,
      columns: seatsPerRow,
      seats,
      layout: layoutMatrix,
    };
  }

  /**
   * Update company logo
   */
  async updateCompanyLogo(ownerId: string, imageUri: string): Promise<PhotoUploadResult> {
    try {
      // Upload logo
      const uploadResult = await this.uploadBoatPhoto(`owner_${ownerId}`, imageUri, 'logo');
      
      if (!uploadResult.success) {
        return uploadResult;
      }

      // Update owner record with logo URL
      const { error } = await supabase
        .from('owners')
        .update({
          logo_url: uploadResult.url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ownerId);

      if (error) throw error;

      return uploadResult;
    } catch (error: any) {
      console.error('Logo update failed:', error);
      return {
        success: false,
        error: error.message || 'Logo update failed',
      };
    }
  }

  /**
   * Get boat statistics for owner
   */
  async getBoatStatistics(ownerId: string): Promise<{
    total_boats: number;
    active_boats: number;
    total_capacity: number;
    boats_with_schedules: number;
  }> {
    try {
      const { data: boats } = await supabase
        .from('boats')
        .select('id, capacity, status')
        .eq('owner_id', ownerId)
        .neq('status', 'INACTIVE');

      const { data: scheduledBoats } = await supabase
        .from('schedules')
        .select('boat_id')
        .eq('owner_id', ownerId)
        .eq('status', 'ACTIVE');

      const uniqueScheduledBoats = new Set((scheduledBoats || []).map(s => s.boat_id));

      return {
        total_boats: boats?.length || 0,
        active_boats: boats?.filter(b => b.status === 'ACTIVE').length || 0,
        total_capacity: boats?.reduce((sum, boat) => sum + (boat.capacity || 0), 0) || 0,
        boats_with_schedules: uniqueScheduledBoats.size,
      };
    } catch (error) {
      console.error('Failed to get boat statistics:', error);
      return {
        total_boats: 0,
        active_boats: 0,
        total_capacity: 0,
        boats_with_schedules: 0,
      };
    }
  }
}

// Export singleton instance
export const boatManagementService = BoatManagementService.getInstance();
