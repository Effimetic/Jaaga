import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Card, Input, Surface } from '../components/catalyst';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { boatManagementService, BoatWithPhotos } from '../services/boatManagementService';
import { colors } from '../theme/theme';

interface BoatFilters {
  status: 'ALL' | 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
  seatMode: 'ALL' | 'SEATMAP' | 'CAPACITY';
}

export const MyBoatsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [boats, setBoats] = useState<BoatWithPhotos[]>([]);
  const [, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<BoatFilters>({
    status: 'ALL',
    seatMode: 'ALL',
  });

  const loadBoats = useCallback(async () => {
    if (!user?.id) return;

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

      const result = await boatManagementService.getOwnerBoats(ownerData.id);
      
      if (result.success) {
        setBoats(result.data || []);
      } else {
        Alert.alert('Error', result.error || 'Failed to load boats');
      }
    } catch (error) {
      console.error('Failed to load boats:', error);
      Alert.alert('Error', 'Failed to load boats');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadBoats();
    }, [loadBoats])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBoats();
    setRefreshing(false);
  };

  const handleDeleteBoat = async (boat: BoatWithPhotos) => {
    Alert.alert(
      'Delete Boat',
      `Are you sure you want to delete "${boat.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await boatManagementService.deleteBoat(boat.id);
            if (result.success) {
              loadBoats();
            } else {
              Alert.alert('Error', result.error || 'Failed to delete boat');
            }
          },
        },
      ]
    );
  };

  const getFilteredBoats = () => {
    let filtered = boats;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(boat =>
        boat.name.toLowerCase().includes(query) ||
        boat.registration?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (filters.status !== 'ALL') {
      filtered = filtered.filter(boat => boat.status === filters.status);
    }

    // Apply seat mode filter
    if (filters.seatMode !== 'ALL') {
      filtered = filtered.filter(boat => boat.seat_mode === filters.seatMode);
    }

    return filtered;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return colors.success;
      case 'MAINTENANCE':
        return colors.warning;
      case 'INACTIVE':
        return colors.error;
      default:
        return '#52525b';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'check-circle';
      case 'MAINTENANCE':
        return 'wrench';
      case 'INACTIVE':
        return 'pause-circle';
      default:
        return 'help-circle';
    }
  };

  const renderBoatCard = (boat: BoatWithPhotos) => (
    <TouchableOpacity 
      key={boat.id} 
      onPress={() => navigation.navigate('ViewBoat', { boatId: boat.id })}
      style={{ marginBottom: 12 }}
    >
      <Card variant="elevated" padding="none">
        {/* Boat Image */}
        <View style={{ height: 120, position: 'relative' }}>
          {boat.primary_photo || (boat.photos && boat.photos.length > 0) ? (
            <Image
              source={{ uri: boat.primary_photo || boat.photos[0] }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <View style={{ 
              width: '100%', 
              height: '100%', 
              backgroundColor: '#f3f4f6', 
              justifyContent: 'center', 
              alignItems: 'center' 
            }}>
              <MaterialCommunityIcons
                name="ferry"
                size={32}
                color="#52525b"
              />
            </View>
          )}

          {/* Status Badge */}
          <View style={{ 
            position: 'absolute', 
            top: 8, 
            right: 8, 
            backgroundColor: getStatusColor(boat.status) + '20',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 12,
            flexDirection: 'row',
            alignItems: 'center'
          }}>
            <MaterialCommunityIcons
              name={getStatusIcon(boat.status)}
              size={12}
              color={getStatusColor(boat.status)}
              style={{ marginRight: 4 }}
            />
            <Text style={{ color: getStatusColor(boat.status), fontSize: 10, fontWeight: '500' }}>
              {boat.status}
            </Text>
          </View>
        </View>

        {/* Boat Details */}
        <View style={{ padding: 12 }}>
          <Text variant="h6" color="primary" style={{ fontSize: 14, fontWeight: '600', marginBottom: 4 }}>
            {boat.name}
          </Text>

          {boat.registration && (
            <Text color="secondary" style={{ fontSize: 11, marginBottom: 8 }}>
              Registration: {boat.registration}
            </Text>
          )}

          <View style={{ flexDirection: 'row', marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
              <MaterialCommunityIcons name="seat" size={14} color="#52525b" />
              <Text color="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
                {boat.capacity} seats
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons
                name={boat.seat_mode === 'SEATMAP' ? 'view-grid' : 'counter'}
                size={14}
                color="#52525b"
              />
              <Text color="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
                {boat.seat_mode === 'SEATMAP' ? 'Seat Map' : 'Capacity'}
              </Text>
            </View>
          </View>

          {boat.amenities && boat.amenities.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
              {boat.amenities.slice(0, 2).map((amenity, index) => (
                <View key={index} style={{
                  backgroundColor: '#f3f4f6',
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 8,
                  marginRight: 4,
                  marginBottom: 4
                }}>
                  <Text color="secondary" style={{ fontSize: 10 }}>
                    {amenity}
                  </Text>
                </View>
              ))}
              {boat.amenities.length > 2 && (
                <Text color="secondary" style={{ fontSize: 10, marginLeft: 4 }}>
                  +{boat.amenities.length - 2} more
                </Text>
              )}
            </View>
          )}

          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <TouchableOpacity
              onPress={() => navigation.navigate('EditBoat', { boatId: boat.id })}
              style={{ 
                flex: 1, 
                marginRight: 4,
                backgroundColor: 'transparent',
                borderWidth: 1,
                borderColor: '#18181b',
                borderRadius: 6,
                paddingVertical: 8,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#18181b', fontSize: 12, fontWeight: '500' }}>
                Edit
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('BoatSchedules', { boatId: boat.id })}
              style={{ 
                flex: 1, 
                marginHorizontal: 4,
                backgroundColor: 'transparent',
                borderWidth: 1,
                borderColor: '#18181b',
                borderRadius: 6,
                paddingVertical: 8,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#18181b', fontSize: 12, fontWeight: '500' }}>
                Schedules
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDeleteBoat(boat)}
              style={{ 
                flex: 1, 
                marginLeft: 4,
                backgroundColor: 'transparent',
                borderWidth: 1,
                borderColor: '#ef4444',
                borderRadius: 6,
                paddingVertical: 8,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '500' }}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  const renderFilters = () => (
    <View style={{ padding: 16, paddingTop: 8 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 4 }}
      >
        {/* Status Filters */}
        {[
          { key: 'ALL', label: 'All Boats' },
          { key: 'ACTIVE', label: 'Active' },
          { key: 'MAINTENANCE', label: 'Maintenance' },
          { key: 'INACTIVE', label: 'Inactive' },
        ].map((filter) => (
          <TouchableOpacity
            key={filter.key}
            onPress={() => setFilters({ ...filters, status: filter.key as any })}
            style={{
              marginRight: 8,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 16,
              backgroundColor: filters.status === filter.key ? '#52525b' : '#f3f4f6',
            }}
          >
            <Text 
              color={filters.status === filter.key ? 'primary' : 'secondary'} 
              style={{ fontSize: 12, fontWeight: '500', color: filters.status === filter.key ? '#ffffff' : undefined }}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Seat Mode Filters */}
        {[
          { key: 'ALL', label: 'All Types' },
          { key: 'SEATMAP', label: 'Seat Map' },
          { key: 'CAPACITY', label: 'Capacity' },
        ].map((filter) => (
          <TouchableOpacity
            key={filter.key}
            onPress={() => setFilters({ ...filters, seatMode: filter.key as any })}
            style={{
              marginRight: 8,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 16,
              backgroundColor: filters.seatMode === filter.key ? '#52525b' : '#f3f4f6',
            }}
          >
            <Text 
              color={filters.seatMode === filter.key ? 'primary' : 'secondary'} 
              style={{ fontSize: 12, fontWeight: '500', color: filters.seatMode === filter.key ? '#ffffff' : undefined }}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderEmptyState = () => {
    const isFiltered = searchQuery.trim() || filters.status !== 'ALL' || filters.seatMode !== 'ALL';
    
    return (
      <View style={{ padding: 32, alignItems: 'center' }}>
        <MaterialCommunityIcons
          name={isFiltered ? "filter-off-outline" : "ferry"}
          size={48}
          color="#52525b"
        />
        <Text variant="h4" color="primary" style={{ fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 8 }}>
          {isFiltered ? 'No boats found' : 'No boats yet'}
        </Text>
        <Text color="secondary" style={{ fontSize: 12, textAlign: 'center', marginBottom: 24 }}>
          {isFiltered
            ? 'Try adjusting your search or filters'
            : 'Add your first boat to start creating schedules'
          }
        </Text>

        {!isFiltered && (
          <TouchableOpacity
            onPress={() => navigation.navigate('AddBoat')}
            style={{
              backgroundColor: '#18181b',
              borderRadius: 8,
              paddingVertical: 16,
              paddingHorizontal: 20,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialCommunityIcons name="plus" size={16} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '600' }}>
              Add Your First Boat
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderBoatsList = () => {
    const filteredBoats = getFilteredBoats();

    if (filteredBoats.length === 0) {
      return renderEmptyState();
    }

    return (
      <View style={{ padding: 16, paddingTop: 8 }}>
        {filteredBoats.map(renderBoatCard)}
      </View>
    );
  };

  const renderSummaryStats = () => {
    const filteredBoats = getFilteredBoats();
    const totalCapacity = filteredBoats.reduce((sum, boat) => sum + (boat.capacity || 0), 0);
    const activeBoats = filteredBoats.filter(boat => boat.status === 'ACTIVE').length;

    if (boats.length === 0) return null;

    return (
      <View style={{ padding: 16, paddingTop: 8 }}>
        <Card variant="elevated" padding="md">
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <View style={{ alignItems: 'center' }}>
              <Text variant="h3" color="primary" style={{ fontSize: 20, fontWeight: '600' }}>
                {filteredBoats.length}
              </Text>
              <Text color="secondary" style={{ fontSize: 11, marginTop: 2 }}>Total Boats</Text>
            </View>

            <View style={{ alignItems: 'center' }}>
              <Text variant="h3" color="primary" style={{ fontSize: 20, fontWeight: '600' }}>
                {activeBoats}
              </Text>
              <Text color="secondary" style={{ fontSize: 11, marginTop: 2 }}>Active</Text>
            </View>

            <View style={{ alignItems: 'center' }}>
              <Text variant="h3" color="primary" style={{ fontSize: 20, fontWeight: '600' }}>
                {totalCapacity}
              </Text>
              <Text color="secondary" style={{ fontSize: 11, marginTop: 2 }}>Total Seats</Text>
            </View>
          </View>
        </Card>
      </View>
    );
  };

  return (
    <Surface variant="default" style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ padding: 16, paddingTop: 20, backgroundColor: '#ffffff' }}>
          <Text variant="h4" color="primary" style={{ fontSize: 18, fontWeight: '600' }}>My Boats</Text>
          <Text color="secondary" style={{ marginTop: 2, fontSize: 12 }}>Manage your boat fleet</Text>
        </View>

        {/* Search Bar */}
        <View style={{ padding: 16, paddingTop: 8 }}>
          <Input
            placeholder="Search boats by name or registration..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Summary Stats */}
        {renderSummaryStats()}

        {/* Filters */}
        {boats.length > 0 && renderFilters()}

        {/* Boats List */}
        {renderBoatsList()}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Add Boat Button */}
      <View style={{ position: 'absolute', bottom: 16, right: 16 }}>
        <TouchableOpacity
          onPress={() => navigation.navigate('AddBoat')}
          style={{
            backgroundColor: '#18181b',
            borderRadius: 28,
            paddingHorizontal: 20,
            paddingVertical: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <MaterialCommunityIcons name="plus" size={20} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '600' }}>
            Add Boat
          </Text>
        </TouchableOpacity>
      </View>
    </Surface>
  );
};


