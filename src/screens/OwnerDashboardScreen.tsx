
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  Image,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { Card, Surface, Text } from '../components/catalyst';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { boatManagementService } from '../services/boatManagementService';
import { scheduleManagementService } from '../services/scheduleManagementService';

interface DashboardStats {
  boats: {
    total: number;
    active: number;
    capacity: number;
    with_schedules: number;
  };
  schedules: {
    upcoming: number;
    today: number;
    sold_out: number;
  };
  sales: {
    today_revenue: number;
    month_revenue: number;
    tickets_sold: number;
  };
}

interface QuickAction {
  title: string;
  icon: string;
  onPress: () => void;
}

export const OwnerDashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [ownerData, setOwnerData] = useState<{ brand_name: string; logo_url?: string } | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    boats: { total: 0, active: 0, capacity: 0, with_schedules: 0 },
    schedules: { upcoming: 0, today: 0, sold_out: 0 },
    sales: { today_revenue: 0, month_revenue: 0, tickets_sold: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Load owner data (brand name and logo)
      const { data: ownerDataResult, error: ownerError } = await supabase
        .from('owners')
        .select('brand_name, logo_url')
        .eq('user_id', user.id)
        .single();

      if (ownerError) {
        console.error('Failed to load owner data:', ownerError);
      } else {
        setOwnerData(ownerDataResult);
      }

      // Load boat statistics
      const boatStats = await boatManagementService.getBoatStatistics(user.id);
      
      // Load schedule statistics
      const scheduleStats = await scheduleManagementService.getScheduleStatistics(user.id);

      setStats({
        boats: {
          total: boatStats.total_boats,
          active: boatStats.active_boats,
          capacity: boatStats.total_capacity,
          with_schedules: boatStats.boats_with_schedules,
        },
        schedules: {
          upcoming: scheduleStats.upcoming_departures,
          today: (scheduleStats as any).today_departures || 0,
          sold_out: (scheduleStats as any).sold_out_schedules || 0,
        },
        sales: {
          today_revenue: (scheduleStats as any).today_revenue || 0,
          month_revenue: scheduleStats.revenue_this_month,
          tickets_sold: scheduleStats.total_bookings,
        },
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      // Don't show alert, just log the error
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const quickActions: QuickAction[] = [
    {
      title: 'My Boats',
      icon: 'ferry',
      onPress: () => navigation.navigate('MyBoats'),
    },
    {
      title: 'Schedules',
      icon: 'calendar',
      onPress: () => navigation.navigate('MySchedules'),
    },
    {
      title: 'Agents',
      icon: 'account-group',
      onPress: () => {
        // TODO: Navigate to Agents screen when implemented
        console.log('Agents screen - to be implemented');
      },
    },
    {
      title: 'Settings',
      icon: 'cog',
      onPress: () => navigation.navigate('OwnerSettings'),
    },
    {
      title: 'Financials',
      icon: 'chart-line',
      onPress: () => navigation.navigate('OwnerFinancials'),
    },
  ];

  const renderHeader = () => (
    <View style={{ padding: 16, paddingTop: 20, backgroundColor: '#ffffff' }}>
      {/* Brand Avatar and Name */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
        <View style={{ 
          width: 48, 
          height: 48, 
          borderRadius: 24, 
          backgroundColor: '#f3f4f6', 
          justifyContent: 'center', 
          alignItems: 'center', 
          marginRight: 12,
          overflow: 'hidden'
        }}>
          {ownerData?.logo_url ? (
            <Image 
              source={{ uri: ownerData.logo_url }} 
              style={{ width: 48, height: 48, borderRadius: 24 }}
              resizeMode="cover"
            />
          ) : (
            <MaterialCommunityIcons name="store" size={24} color="#52525b" />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="h4" color="primary" style={{ fontSize: 20, fontWeight: '600', color: '#18181b' }}>
            {ownerData?.brand_name || 'Owner Dashboard'}
          </Text>
          <Text color="secondary" style={{ marginTop: 2, fontSize: 12, color: '#71717a' }}>
            Welcome back, {user?.phone?.slice(-4)}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderStatsList = () => (
    <View style={{ padding: 16 }}>
      <Text variant="h6" color="primary" style={{ fontSize: 14, fontWeight: '600', marginBottom: 12 }}>Summary</Text>
      
      {/* Boats */}
      <TouchableOpacity onPress={() => navigation.navigate('MyBoats')}>
        <Card variant="outlined" padding="sm" style={{ marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ 
                width: 28, 
                height: 28, 
                borderRadius: 14, 
                backgroundColor: '#f3f4f6', 
                justifyContent: 'center', 
                alignItems: 'center', 
                marginRight: 12 
              }}>
                <MaterialCommunityIcons name="ferry" size={16} color="#52525b" />
              </View>
              <View>
                <Text variant="h6" color="primary" style={{ fontSize: 13, fontWeight: '500' }}>Boats</Text>
                <Text color="secondary" style={{ fontSize: 11 }}>{stats.boats.active} active</Text>
              </View>
            </View>
            <Text variant="h6" color="primary" style={{ fontSize: 16, fontWeight: '600' }}>{stats.boats.total}</Text>
          </View>
        </Card>
      </TouchableOpacity>

      {/* Today's Schedule */}
      <TouchableOpacity onPress={() => navigation.navigate('MySchedules')}>
        <Card variant="outlined" padding="sm" style={{ marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ 
                width: 28, 
                height: 28, 
                borderRadius: 14, 
                backgroundColor: '#f3f4f6', 
                justifyContent: 'center', 
                alignItems: 'center', 
                marginRight: 12 
              }}>
                <MaterialCommunityIcons name="calendar-today" size={16} color="#52525b" />
              </View>
              <View>
                <Text variant="h6" color="primary" style={{ fontSize: 13, fontWeight: '500' }}>Today&apos;s Schedule</Text>
                <Text color="secondary" style={{ fontSize: 11 }}>{stats.schedules.upcoming} upcoming</Text>
              </View>
            </View>
            <Text variant="h6" color="primary" style={{ fontSize: 16, fontWeight: '600' }}>{stats.schedules.today}</Text>
          </View>
        </Card>
      </TouchableOpacity>

      {/* This Month */}
      <TouchableOpacity onPress={() => navigation.navigate('OwnerFinancials')}>
        <Card variant="outlined" padding="sm">
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ 
                width: 28, 
                height: 28, 
                borderRadius: 14, 
                backgroundColor: '#f3f4f6', 
                justifyContent: 'center', 
                alignItems: 'center', 
                marginRight: 12 
              }}>
                <MaterialCommunityIcons name="currency-usd" size={16} color="#52525b" />
              </View>
              <View>
                <Text variant="h6" color="primary" style={{ fontSize: 13, fontWeight: '500' }}>This Month</Text>
                <Text color="secondary" style={{ fontSize: 11 }}>{stats.sales.tickets_sold} tickets sold</Text>
              </View>
            </View>
            <Text variant="h6" color="primary" style={{ fontSize: 16, fontWeight: '600' }}>MVR {stats.sales.month_revenue.toLocaleString()}</Text>
          </View>
        </Card>
      </TouchableOpacity>
    </View>
  );

  const renderQuickActions = () => (
    <View style={{ padding: 16 }}>
      <Text variant="h6" color="primary" style={{ fontSize: 14, fontWeight: '600', marginBottom: 12 }}>Quick Actions</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 8 }}>
        {quickActions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={{ alignItems: 'center', flex: 1 }}
            onPress={action.onPress}
          >
            <View style={{ 
              width: 40, 
              height: 40, 
              borderRadius: 20, 
              backgroundColor: '#f3f4f6', 
              justifyContent: 'center', 
              alignItems: 'center', 
              marginBottom: 6 
            }}>
              <MaterialCommunityIcons name={action.icon as any} size={20} color="#52525b" />
            </View>
            <Text variant="caption" color="secondary" style={{ fontSize: 10, textAlign: 'center', maxWidth: 60 }}>{action.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (loading) {
    return (
      <Surface variant="default" style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text variant="h6" color="secondary" style={{ fontSize: 14 }}>Loading dashboard...</Text>
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
        {renderStatsList()}
        {renderQuickActions()}

        <View style={{ height: 32 }} />
      </ScrollView>
    </Surface>
  );
};
