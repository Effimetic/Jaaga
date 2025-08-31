import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Image,
    ScrollView,
    TouchableOpacity,
    View
} from 'react-native';
import { Card, Input, Surface, Text } from '../components/catalyst';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { boatManagementService } from '../services/boatManagementService';

interface BrandData {
  brand_name: string;
  logo_url?: string;
}

export const BrandSettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [brandData, setBrandData] = useState<BrandData>({
    brand_name: '',
    logo_url: undefined
  });

  const loadBrandData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const { data: ownerData, error } = await supabase
        .from('owners')
        .select('brand_name, logo_url')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Failed to load brand data:', error);
        Alert.alert('Error', 'Failed to load brand information');
        return;
      }

      if (ownerData) {
        setBrandData({
          brand_name: ownerData.brand_name || '',
          logo_url: ownerData.logo_url || undefined
        });
      }
    } catch (error) {
      console.error('Failed to load brand data:', error);
      Alert.alert('Error', 'Failed to load brand information');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadBrandData();
  }, [loadBrandData]);

  const handleSave = async () => {
    if (!user?.id) return;

    if (!brandData.brand_name.trim()) {
      Alert.alert('Validation Error', 'Brand name is required');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('owners')
        .update({
          brand_name: brandData.brand_name.trim(),
          logo_url: brandData.logo_url,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      Alert.alert('Success', 'Brand settings updated successfully!');
    } catch (error: any) {
      console.error('Failed to update brand settings:', error);
      Alert.alert('Error', error.message || 'Failed to update brand settings');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async () => {
    if (!user?.id) return;

    try {
      setUploadingLogo(true);
      
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

      // Pick image using the same approach as boat images
      const imageAsset = await boatManagementService.pickImage('gallery');
      if (!imageAsset) {
        setUploadingLogo(false);
        return;
      }

      // Upload logo using the same service
      const result = await boatManagementService.updateCompanyLogo(ownerData.id, imageAsset.uri);
      
      if (result.success && result.url) {
        setBrandData(prev => ({ ...prev, logo_url: result.url }));
        Alert.alert('Success', 'Logo uploaded successfully!');
      } else {
        Alert.alert('Error', result.error || 'Failed to upload logo');
      }
    } catch (error: any) {
      console.error('Logo upload failed:', error);
      Alert.alert('Error', 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    Alert.alert(
      'Remove Logo',
      'Are you sure you want to remove the current logo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setBrandData(prev => ({ ...prev, logo_url: undefined }));
          }
        }
      ]
    );
  };

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
            Brand & Logo
          </Text>
          <Text color="secondary" style={{ 
            marginTop: 4, 
            fontSize: 14,
            color: '#71717a'
          }}>
            Configure your business brand identity
          </Text>
        </View>

        {/* Brand Name */}
        <View style={{ padding: 16, paddingTop: 8 }}>
          <Card variant="elevated" padding="md">
            <Text variant="h6" color="primary" style={{ 
              fontSize: 16, 
              fontWeight: '600', 
              marginBottom: 16,
              color: '#18181b'
            }}>
              Brand Name
            </Text>
            
            <Input
              label="Company/Brand Name *"
              value={brandData.brand_name}
              onChangeText={(text: string) => 
                setBrandData(prev => ({ ...prev, brand_name: text }))
              }
              placeholder="Enter your company or brand name"
              style={{
                fontSize: 14,
                paddingVertical: 12,
                paddingHorizontal: 16,
              }}
            />
          </Card>
        </View>

        {/* Logo Section */}
        <View style={{ padding: 16, paddingTop: 0 }}>
          <Card variant="elevated" padding="md">
            <Text variant="h6" color="primary" style={{ 
              fontSize: 16, 
              fontWeight: '600', 
              marginBottom: 16,
              color: '#18181b'
            }}>
              Company Logo
            </Text>

            {/* Current Logo */}
            {brandData.logo_url ? (
              <View style={{ marginBottom: 16 }}>
                            <Text color="secondary" style={{ 
              fontSize: 12, 
              marginBottom: 8,
              color: '#71717a'
            }}>
              Current Logo
            </Text>
                <View style={{ 
                  width: 120, 
                  height: 120, 
                  borderRadius: 8,
                  overflow: 'hidden',
                  backgroundColor: '#f3f4f6',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Image
                    source={{ uri: brandData.logo_url }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                </View>
              </View>
            ) : (
                          <View style={{ 
              width: 120, 
              height: 120, 
              borderRadius: 8,
              backgroundColor: '#f4f4f5',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16
            }}>
              <MaterialCommunityIcons
                name="image-outline"
                size={32}
                color="#71717a"
              />
            </View>
            )}

            {/* Logo Actions */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={handleLogoUpload}
                disabled={uploadingLogo}
                style={{
                  flex: 1,
                  backgroundColor: '#18181b',
                  borderRadius: 8,
                  paddingVertical: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: uploadingLogo ? 0.6 : 1
                }}
              >
                <Text style={{ 
                  color: '#ffffff', 
                  fontSize: 14, 
                  fontWeight: '600' 
                }}>
                  {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                </Text>
              </TouchableOpacity>

              {brandData.logo_url && (
                <TouchableOpacity
                  onPress={handleRemoveLogo}
                  style={{
                    flex: 1,
                    backgroundColor: 'transparent',
                    borderWidth: 1,
                    borderColor: '#ef4444',
                    borderRadius: 8,
                    paddingVertical: 12,
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Text style={{ 
                    color: '#ef4444', 
                    fontSize: 14, 
                    fontWeight: '600' 
                  }}>
                    Remove
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <Text color="secondary" style={{ 
              fontSize: 11, 
              marginTop: 8,
              color: '#71717a'
            }}>
              Recommended size: 200x200px or larger. Supported formats: JPG, PNG
            </Text>
          </Card>
        </View>

        {/* Save Button */}
        <View style={{ padding: 16, paddingTop: 0 }}>
                  <TouchableOpacity
          onPress={handleSave}
          disabled={loading}
          style={{
            backgroundColor: '#18181b',
            borderRadius: 8,
            paddingVertical: 16,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: loading ? 0.6 : 1
          }}
        >
          <Text style={{ 
            color: '#ffffff', 
            fontSize: 16, 
            fontWeight: '600' 
          }}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Text>
        </TouchableOpacity>
        </View>
      </ScrollView>
    </Surface>
  );
};
