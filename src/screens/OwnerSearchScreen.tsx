import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
    Alert,
    RefreshControl,
    ScrollView,
    TouchableOpacity,
    View,
} from 'react-native';
import { Card, Surface, Text } from '../components/catalyst';
import { CustomDatePicker } from '../components/CustomDatePicker';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { scheduleManagementService } from '../services/scheduleManagementService';
import { Schedule, ScheduleTemplate, Destination, Boat } from '../types';

interface ScheduleWithDetails extends Schedule {
  boat: {
    id: string;
    name: string;
    registration: string;
    capacity: number;
  };
  schedule_ticket_types: {
    ticket_type: {
      id: string;
      name: string;
      price: number;
      currency: string;
    };
  }[];
}

export const OwnerSearchScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<ScheduleWithDetails[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'destinations' | 'boats'>('destinations');
  const [selectedDestination, setSelectedDestination] = useState<string>('');
  const [selectedBoat, setSelectedBoat] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<'today' | 'thisWeek' | 'thisMonth' | 'custom'>('thisWeek');
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Placeholder implementation
  const loadData = useCallback(async () => {
    // TODO: Implement data loading
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const renderHeader = () => (
    <View style={{ padding: 16, paddingTop: 20, backgroundColor: '#ffffff' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Text variant="h4" color="primary" style={{ fontSize: 20, fontWeight: '600', color: '#18181b' }}>
          Search Trips
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('ScheduleWizard')}
          style={{
            backgroundColor: '#18181b',
            borderRadius: 20,
            width: 40,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <MaterialCommunityIcons name="plus" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={{ flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 8, padding: 4 }}>
        <TouchableOpacity
          onPress={() => setActiveTab('destinations')}
          style={{
            flex: 1,
            backgroundColor: activeTab === 'destinations' ? '#ffffff' : 'transparent',
            borderRadius: 6,
            paddingVertical: 8,
            alignItems: 'center',
            shadowColor: activeTab === 'destinations' ? '#000' : 'transparent',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: activeTab === 'destinations' ? 0.1 : 0,
            shadowRadius: 2,
            elevation: activeTab === 'destinations' ? 2 : 0,
          }}
        >
          <Text style={{
            fontSize: 14,
            fontWeight: '600',
            color: activeTab === 'destinations' ? '#18181b' : '#6b7280'
          }}>
            Destinations
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('boats')}
          style={{
            flex: 1,
            backgroundColor: activeTab === 'boats' ? '#ffffff' : 'transparent',
            borderRadius: 6,
            paddingVertical: 8,
            alignItems: 'center',
            shadowColor: activeTab === 'boats' ? '#000' : 'transparent',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: activeTab === 'boats' ? 0.1 : 0,
            shadowRadius: 2,
            elevation: activeTab === 'boats' ? 2 : 0,
          }}
        >
          <Text style={{
            fontSize: 14,
            fontWeight: '600',
            color: activeTab === 'boats' ? '#18181b' : '#6b7280'
          }}>
            Boats
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderContent = () => (
    <View style={{ padding: 32, alignItems: 'center' }}>
      <MaterialCommunityIcons name="magnify" size={48} color="#d1d5db" />
      <Text style={{ fontSize: 16, color: '#6b7280', marginTop: 16, textAlign: 'center' }}>
        Search functionality coming soon
      </Text>
      <Text style={{ fontSize: 14, color: '#9ca3af', marginTop: 8, textAlign: 'center' }}>
        This will allow boat owners to search trips by destination or boat
      </Text>
    </View>
  );

  if (loading) {
    return (
      <Surface variant="default" style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text variant="h6" color="secondary" style={{ fontSize: 14 }}>Loading...</Text>
      </Surface>
    );
  }

  return (
    <Surface variant="default" style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderHeader()}
        
        <View style={{ padding: 16, paddingTop: 0 }}>
          {renderContent()}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Custom Date Picker */}
      <CustomDatePicker
        visible={showCustomDatePicker}
        onClose={() => setShowCustomDatePicker(false)}
        onConfirm={(startDate: string, endDate: string) => {
          setCustomStartDate(startDate);
          setCustomEndDate(endDate);
          setShowCustomDatePicker(false);
        }}
        initialStart={customStartDate}
        initialEnd={customEndDate}
        maximumDate={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)} // Max 1 year from now
      />
    </Surface>
  );
};
