import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Image,
    ScrollView,
    TouchableOpacity,
    View,
} from 'react-native';
import { Card, Input, Surface, Text } from '../components/catalyst';
import { supabase } from '../config/supabase';
import { Destination } from '../types';

interface DestinationListScreenProps {
  navigation: any;
  route: {
    params: {
      stopIndex: number;
      selectedDestinationId?: string;
      onDestinationSelect: (destination: Destination) => void;
    };
  };
}

export const DestinationListScreen: React.FC<DestinationListScreenProps> = ({ 
  navigation, 
  route 
}) => {
  const [loading, setLoading] = useState(false);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [filteredDestinations, setFilteredDestinations] = useState<Destination[]>([]);
  const [searchText, setSearchText] = useState('');

  const loadDestinations = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load destinations (global table, no owner filtering)
      const { data: destData, error: destError } = await supabase
        .from('destinations')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (destError) {
        console.error('Failed to load destinations:', destError);
        Alert.alert('Error', 'Failed to load destinations');
      } else {
        setDestinations(destData || []);
        setFilteredDestinations(destData || []);
      }
    } catch (error) {
      console.error('Failed to load destinations:', error);
      Alert.alert('Error', 'Failed to load destinations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDestinations();
  }, [loadDestinations]);

  const handleSearch = (text: string) => {
    setSearchText(text);
    if (text.trim() === '') {
      setFilteredDestinations(destinations);
    } else {
      const filtered = destinations.filter(dest => 
        dest.name.toLowerCase().includes(text.toLowerCase()) ||
        dest.address?.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredDestinations(filtered);
    }
  };

  const handleDestinationSelect = (destination: Destination) => {
    console.log('Destination selected:', destination.name, 'for stop index:', route.params?.stopIndex);
    // Go back to the previous screen (ScheduleWizard) with the selected destination data
    navigation.goBack();
    // Use setTimeout to ensure navigation is complete before updating
    setTimeout(() => {
      // This will be handled by the parent screen when it receives the selection
      if (route.params?.onDestinationSelect) {
        route.params.onDestinationSelect(destination);
      }
    }, 100);
  };

  const renderDestinationItem = (destination: Destination) => {
    const isSelected = route.params?.selectedDestinationId === destination.id;
    
    return (
      <TouchableOpacity
        key={destination.id}
        onPress={() => handleDestinationSelect(destination)}
        style={{ marginBottom: 12 }}
      >
        <Card 
          variant="outlined" 
          padding="md"
          style={{
            borderColor: isSelected ? '#10b981' : '#d1d5db',
            borderWidth: isSelected ? 2 : 1,
            backgroundColor: isSelected ? '#10b98110' : '#ffffff',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {/* Destination Photo */}
            <View style={{ 
              width: 48, 
              height: 48, 
              borderRadius: 24, 
              backgroundColor: '#f3f4f6',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 16,
              overflow: 'hidden'
            }}>
              {destination.photo_url ? (
                <Image 
                  source={{ uri: destination.photo_url }} 
                  style={{ width: 48, height: 48, borderRadius: 24 }}
                  resizeMode="cover"
                />
              ) : (
                <MaterialCommunityIcons name="map-marker" size={24} color="#6b7280" />
              )}
            </View>

            {/* Destination Info */}
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: isSelected ? '#10b981' : '#18181b',
                marginBottom: 4
              }}>
                {destination.name}
              </Text>
              {destination.address && (
                <Text style={{
                  fontSize: 14,
                  color: isSelected ? '#10b981' : '#6b7280',
                  marginBottom: 2
                }}>
                  {destination.address}
                </Text>
              )}
              {destination.description && (
                <Text style={{
                  fontSize: 12,
                  color: isSelected ? '#10b981' : '#9ca3af'
                }}>
                  {destination.description}
                </Text>
              )}
            </View>

            {/* Selection Indicator */}
            {isSelected && (
              <View style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: '#10b981',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <MaterialCommunityIcons name="check" size={16} color="#ffffff" />
              </View>
            )}
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <Surface variant="default" style={{ flex: 1 }}>
      {/* Header */}
      <View style={{ 
        padding: 16, 
        paddingTop: 20, 
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb'
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ marginRight: 16 }}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#18181b" />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: '600', color: '#18181b' }}>
            Select Destination
          </Text>
        </View>

        {/* Search Input */}
        <Input
          value={searchText}
          onChangeText={handleSearch}
          placeholder="Search destinations by name or address..."
          style={{
            fontSize: 16,
            paddingVertical: 12,
            paddingHorizontal: 16,
          }}
        />
      </View>

      {/* Destinations List */}
      <ScrollView style={{ flex: 1, padding: 16 }}>
        {loading ? (
          <View style={{ alignItems: 'center', padding: 40 }}>
            <Text style={{ fontSize: 16, color: '#6b7280' }}>
              Loading destinations...
            </Text>
          </View>
        ) : filteredDestinations.length === 0 ? (
          <View style={{ alignItems: 'center', padding: 40 }}>
            <MaterialCommunityIcons name="map-marker-off" size={48} color="#9ca3af" />
            <Text style={{ fontSize: 16, color: '#6b7280', marginTop: 16, textAlign: 'center' }}>
              {searchText ? 'No destinations found matching your search' : 'No destinations available'}
            </Text>
          </View>
        ) : (
          <>
            <Text style={{ 
              fontSize: 14, 
              color: '#6b7280', 
              marginBottom: 16,
              textAlign: 'center'
            }}>
              {filteredDestinations.length} destination{filteredDestinations.length !== 1 ? 's' : ''} found
            </Text>
            {filteredDestinations.map(renderDestinationItem)}
          </>
        )}
      </ScrollView>
    </Surface>
  );
};
