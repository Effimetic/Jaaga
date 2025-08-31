import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { supabase } from '../config/supabase';
import {
  ApiResponse,
  Boat,
  BoatCreateRequest,
  BoatUpdateRequest,
  Seat,
  SeatMap
} from '../types';

export interface PhotoUploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

export interface BoatWithPhotos extends Boat {
  // All fields are now included in the base Boat type from database schema
  // This interface is kept for backward compatibility
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
      console.log('Requesting camera and gallery permissions...');
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: galleryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      console.log('Camera permission:', cameraStatus);
      console.log('Gallery permission:', galleryStatus);
      
      const hasPermissions = cameraStatus === 'granted' && galleryStatus === 'granted';
      console.log('Has permissions:', hasPermissions);
      
      return hasPermissions;
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
      console.log('pickImage called with source:', source);
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        console.log('Permissions not granted');
        Alert.alert('Permissions Required', 'Please grant camera and photo permissions to upload images.');
        return null;
      }
      
      console.log('Permissions granted, launching picker...');

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9], // Good aspect ratio for boats
        quality: 0.8,
      };

      let result: ImagePicker.ImagePickerResult;
      
      if (source === 'camera') {
        console.log('Launching camera...');
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        console.log('Launching image library...');
        result = await ImagePicker.launchImageLibraryAsync(options);
      }
      
      console.log('Picker result:', result);

      if (!result.canceled && result.assets.length > 0) {
        console.log('Image selected:', result.assets[0]);
        return result.assets[0];
      }

      console.log('No image selected or picker was canceled');
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
    type: 'boat' | 'logo' = 'boat',
    customFileName?: string
  ): Promise<PhotoUploadResult> {
    try {
      // Process image
      const processedUri = await this.processImage(imageUri);
      
      // Generate filename
      let fileName: string;
      if (customFileName) {
        fileName = `${type}s/${boatId}/${customFileName}`;
      } else {
        const timestamp = Date.now();
        const fileExtension = 'jpg';
        fileName = `${type}s/${boatId}/${timestamp}.${fileExtension}`;
      }
      
      // Since we're using our own SMS authentication, we'll use the Edge Function
      // which has access to the service role key and bypasses RLS policies
      console.log('🔍 [DEBUG] Using Edge Function for Storage upload');
      console.log('🔍 [DEBUG] Upload fileName:', fileName);
      
      // Convert image to base64 for Edge Function
      const base64Image = await this.imageToBase64(processedUri);
      
      // Upload via Edge Function (bypasses RLS policies)
      const { data, error } = await supabase.functions.invoke('upload-boat-photo', {
        body: {
          boatId: boatId,
          imageData: base64Image,
          fileName: fileName,
          contentType: 'image/jpeg'
        }
      });

      if (error) {
        console.error('Edge Function error:', error);
        throw new Error('Failed to upload photo via Edge Function');
      }

      if (!data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      console.log('✅ Photo uploaded successfully via Edge Function');
      console.log('🔍 [DEBUG] Upload result:', data);

      return {
        success: true,
        url: data.url,
        path: data.path,
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
        .from('boat-photos')
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
          status: boatData.status || 'ACTIVE',
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
        data: undefined,
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
          status: boatData.status,
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
        data: undefined,
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
        data: undefined,
      };
    }
  }

  /**
   * Generate default seat map
   */
  generateDefaultSeatMap(capacity: number, layout: 'single' | 'double' = 'double'): SeatMap {
    const seatsPerRow = layout === 'single' ? 2 : 4;
    const rows = Math.ceil(capacity / seatsPerRow);
    const seats: Seat[] = [];
    const layoutMatrix: string[][] = [];

    let seatCounter = 1;

    for (let row = 0; row < rows; row++) {
      const rowSeats: Seat[] = [];
      const rowLayout: string[] = [];

      for (let col = 0; col < seatsPerRow; col++) {
        if (seatCounter <= capacity) {
          // Skip middle seats for aisle in double layout
          if (layout === 'double' && (col === 1 || col === 2)) {
            rowLayout.push('');
            if (col === 2) continue; // Skip the actual seat creation for aisle
          }

          const seatId = `${String.fromCharCode(65 + row)}${col < seatsPerRow / 2 ? col + 1 : col}`;
          
          const seat = {
            id: seatId,
            row,
            column: col,
            type: 'seat' as const,
            available: true,
            price_multiplier: 1.0,
          };
          
          seats.push(seat);
          rowSeats.push(seat);
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

  /**
   * Convert image URI to base64 string
   */
  private async imageToBase64(uri: string): Promise<string> {
    try {
      // For React Native, we need to read the file and convert to base64
      const response = await fetch(uri);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            // Remove the data:image/jpeg;base64, prefix
            const base64 = reader.result.split(',')[1];
            resolve(base64);
          } else {
            reject(new Error('Failed to convert image to base64'));
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting image to base64:', error);
      throw new Error('Failed to convert image to base64');
    }
  }
}

// Export singleton instance
export const boatManagementService = BoatManagementService.getInstance();
