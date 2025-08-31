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
import { Schedule, ScheduleTemplate } from '../types';

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

export const MySchedulesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<ScheduleWithDetails[]>([]);
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'schedules' | 'templates'>('schedules');
  const [dateFilter, setDateFilter] = useState<'today' | 'thisWeek' | 'thisMonth' | 'custom'>('thisWeek');
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  const loadSchedules = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

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

      // Load schedules with date filter
      const dateRange = getDateRange();
      
      const schedulesResponse = await scheduleManagementService.getOwnerSchedules(ownerData.id);
      if (schedulesResponse.success) {
        let filteredSchedules = schedulesResponse.data as ScheduleWithDetails[];
        
        // Filter schedules by start_at date
        const { start, end } = getDateRange();

        filteredSchedules = filteredSchedules.filter(s => {
          if (!s.start_at) return false;
          const dt = new Date(s.start_at);               // use the actual timestamp
          return dt >= start && dt < end;                // within [start, end)
        });
        
        setSchedules(filteredSchedules);
      }

      // Load templates
      const templatesResponse = await scheduleManagementService.getTemplates(ownerData.id);
      if (templatesResponse.success) {
        setTemplates(templatesResponse.data || []);
      }
    } catch (error) {
      console.error('Failed to load schedules:', error);
      Alert.alert('Error', 'Failed to load schedules');
    } finally {
      setLoading(false);
    }
  }, [user?.id, dateFilter, customStartDate, customEndDate]);

  useFocusEffect(
    useCallback(() => {
      loadSchedules();
    }, [loadSchedules])
  );

  // Ensure reload runs when filters change
  React.useEffect(() => {
    loadSchedules();
  }, [dateFilter, customStartDate, customEndDate, loadSchedules]);



  const onRefresh = async () => {
    setRefreshing(true);
    await loadSchedules();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return '#10b981';
      case 'DRAFT':
        return '#f59e0b';
      case 'SUSPENDED':
        return '#ef4444';
      case 'COMPLETED':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'Active';
      case 'DRAFT':
        return 'Draft';
      case 'SUSPENDED':
        return 'Suspended';
      case 'COMPLETED':
        return 'Completed';
      default:
        return status;
    }
  };

  // Date filter functions
  const getDateRange = () => {
    const now = new Date();

    // Local day boundaries
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    switch (dateFilter) {
      case 'today':
        return { start: startOfToday, end: startOfTomorrow };

      case 'thisWeek': {
        // ISO week start = Monday
        const day = (startOfToday.getDay() + 6) % 7; // 0=Mon ... 6=Sun
        const start = new Date(startOfToday);
        start.setDate(start.getDate() - day);
        const end = new Date(start);
        end.setDate(end.getDate() + 7);
        return { start, end };
      }

      case 'thisMonth': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        return { start, end };
      }

      case 'custom': {
        if (customStartDate && customEndDate) {
          // custom* are "YYYY-MM-DD"
          const s = new Date(customStartDate);
          const e = new Date(customEndDate);
          const start = new Date(s.getFullYear(), s.getMonth(), s.getDate());           // 00:00 local
          const end = new Date(e.getFullYear(), e.getMonth(), e.getDate() + 1);         // exclusive (+1 day)
          return { start, end };
        }
        return { start: startOfToday, end: startOfTomorrow };
      }

      default:
        return { start: startOfToday, end: startOfTomorrow };
    }
  };

  const handleDateFilterChange = (filter: 'today' | 'thisWeek' | 'thisMonth' | 'custom') => {
    setDateFilter(filter);
    if (filter === 'custom') {
      setCustomStartDate('');
      setCustomEndDate('');
      setShowCustomDatePicker(true);
    } else {
      setCustomStartDate('');
      setCustomEndDate('');
    }
  };

  const handleCustomDateConfirm = (startDate: string, endDate: string) => {
    setCustomStartDate(startDate);
    setCustomEndDate(endDate);
    setShowCustomDatePicker(false);
  };

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatRouteWithTimes = (schedule: ScheduleWithDetails) => {
    if (!schedule.segments || schedule.segments.length === 0) {
      return 'No route information';
    }

    // Get the route stops from the first segment's departure and last segment's arrival
    const routeParts = [];
    
    // Add first stop with departure time
    if (schedule.segments[0]?.departure_time) {
      const departureTime = new Date(schedule.segments[0].departure_time).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      routeParts.push(`${departureTime} ${schedule.segments[0].from_stop_name || 'Stop 1'}`);
    }
    
    // Add middle stops with arrival and departure times
    for (let i = 0; i < schedule.segments.length; i++) {
      const segment = schedule.segments[i];
      const nextSegment = schedule.segments[i + 1];
      
      if (segment.arrival_time && nextSegment?.departure_time) {
        const arrivalTime = new Date(segment.arrival_time).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        const departureTime = new Date(nextSegment.departure_time).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        routeParts.push(`${arrivalTime} → ${departureTime} ${nextSegment.from_stop_name || `Stop ${i + 2}`}`);
      }
    }
    
    // Add last stop with arrival time
    const lastSegment = schedule.segments[schedule.segments.length - 1];
    if (lastSegment?.arrival_time) {
      const arrivalTime = new Date(lastSegment.arrival_time).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      routeParts.push(`${arrivalTime} ${lastSegment.to_stop_name || 'Final Stop'}`);
    }
    
    return routeParts.join(' → ');
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    Alert.alert(
      'Delete Schedule',
      'Are you sure you want to delete this schedule? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await scheduleManagementService.deleteSchedule(scheduleId);
              if (response.success) {
                Alert.alert('Success', 'Schedule deleted successfully');
                loadSchedules();
              } else {
                Alert.alert('Error', response.error || 'Failed to delete schedule');
              }
            } catch (error) {
              console.error('Delete failed:', error);
              Alert.alert('Error', 'Failed to delete schedule');
            }
          },
        },
      ]
    );
  };

  const handleDeleteTemplate = async (templateId: string) => {
    Alert.alert(
      'Delete Template',
      'Are you sure you want to delete this template? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await scheduleManagementService.deleteTemplate(templateId);
              if (response.success) {
                Alert.alert('Success', 'Template deleted successfully');
                loadSchedules(); // This will also reload templates
              } else {
                Alert.alert('Error', response.error || 'Failed to delete template');
              }
            } catch (error) {
              console.error('Delete failed:', error);
              Alert.alert('Error', 'Failed to delete template');
            }
          },
        },
      ]
    );
  };

  const renderHeader = () => (
    <View style={{ padding: 16, paddingTop: 20, backgroundColor: '#ffffff' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Text variant="h4" color="primary" style={{ fontSize: 20, fontWeight: '600', color: '#18181b' }}>
          Schedule Management
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
          onPress={() => setActiveTab('schedules')}
          style={{
            flex: 1,
            backgroundColor: activeTab === 'schedules' ? '#ffffff' : 'transparent',
            borderRadius: 6,
            paddingVertical: 8,
            alignItems: 'center',
            shadowColor: activeTab === 'schedules' ? '#000' : 'transparent',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: activeTab === 'schedules' ? 0.1 : 0,
            shadowRadius: 2,
            elevation: activeTab === 'schedules' ? 2 : 0,
          }}
        >
          <Text style={{
            fontSize: 14,
            fontWeight: '600',
            color: activeTab === 'schedules' ? '#18181b' : '#6b7280'
          }}>
            Schedules ({schedules.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('templates')}
          style={{
            flex: 1,
            backgroundColor: activeTab === 'templates' ? '#ffffff' : 'transparent',
            borderRadius: 6,
            paddingVertical: 8,
            alignItems: 'center',
            shadowColor: activeTab === 'templates' ? '#000' : 'transparent',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: activeTab === 'templates' ? 0.1 : 0,
            shadowRadius: 2,
            elevation: activeTab === 'templates' ? 2 : 0,
          }}
        >
          <Text style={{
            fontSize: 14,
            fontWeight: '600',
            color: activeTab === 'templates' ? '#18181b' : '#6b7280'
          }}>
            Templates ({templates.length})
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderScheduleCard = (schedule: ScheduleWithDetails) => (
    <Card key={schedule.id} variant="outlined" padding="md" style={{ marginBottom: 12 }}>
      <View style={{ gap: 12 }}>
        {/* Header with Date Avatar and Departure Time */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          {/* Date Avatar */}
          <View style={{ alignItems: 'center' }}>
            <View style={{
              width: 50,
              height: 50,
              backgroundColor: '#f3f4f6',
              borderRadius: 8,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: '#e5e7eb'
            }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#18181b' }}>
                {new Date(schedule.start_at).getDate()}
              </Text>
              <Text style={{ fontSize: 10, fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>
                {new Date(schedule.start_at).toLocaleDateString('en-US', { month: 'short' })}
              </Text>
            </View>
          </View>
          
          {/* Schedule Info with Status Badge */}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#18181b', marginBottom: 4 }}>
              {schedule.boat?.name || 'Untitled Schedule'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>
                {schedule.boat?.name || 'Untitled Schedule'}
              </Text>
              {/* Status Badge - Very Small */}
              <View style={{
                backgroundColor: getStatusColor(schedule.status) + '20',
                paddingHorizontal: 4,
                paddingVertical: 2,
                borderRadius: 8
              }}>
                <Text style={{ color: getStatusColor(schedule.status), fontSize: 8, fontWeight: '500' }}>
                  {getStatusText(schedule.status)}
                </Text>
              </View>
            </View>
          </View>
          
          {/* Departure Time - Right Side */}
          {schedule.segments && schedule.segments.length > 0 && schedule.segments[0]?.departure_time && (
            <View style={{ alignItems: 'center', justifyContent: 'center', minWidth: 60 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#10b981' }}>
                {new Date(schedule.segments[0].departure_time).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </Text>
            </View>
          )}
        </View>



        {/* Seats Status Card */}
        <View style={{ 
          backgroundColor: '#f9fafb', 
          borderRadius: 8, 
          padding: 12, 
          marginTop: 8,
          borderWidth: 1,
          borderColor: '#e5e7eb'
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {/* Total Seats */}
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#18181b' }}>
                {schedule.boat?.capacity || 0}
              </Text>
              <Text style={{ fontSize: 10, color: '#6b7280', textAlign: 'center' }}>
                Total Seats
              </Text>
            </View>
            
            {/* Available Seats */}
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#10b981' }}>
                {schedule.boat?.capacity || 0}
              </Text>
              <Text style={{ fontSize: 10, color: '#6b7280', textAlign: 'center' }}>
                Available
              </Text>
            </View>
            
            {/* Booked Seats */}
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#f59e0b' }}>
                0
              </Text>
              <Text style={{ fontSize: 10, color: '#6b7280', textAlign: 'center' }}>
                Booked
              </Text>
            </View>
            
            {/* Tickets Issued */}
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#ef4444' }}>
                0
              </Text>
              <Text style={{ fontSize: 10, color: '#6b7280', textAlign: 'center' }}>
                Tickets
              </Text>
            </View>
          </View>
        </View>

        {/* Route with Times */}
        <View style={{ backgroundColor: '#f9fafb', padding: 12, borderRadius: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
            Route
          </Text>
          <Text style={{ fontSize: 13, color: '#374151', lineHeight: 18 }}>
            {formatRouteWithTimes(schedule)}
          </Text>
        </View>

        {/* Actions */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => navigation.navigate('ScheduleWizard', { editScheduleId: schedule.id })}
            style={{
              flex: 1,
              backgroundColor: '#f3f4f6',
              borderRadius: 6,
              paddingVertical: 8,
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Text style={{ color: '#374151', fontSize: 12, fontWeight: '500' }}>
              Edit
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDeleteSchedule(schedule.id)}
            style={{
              flex: 1,
              backgroundColor: '#fef2f2',
              borderRadius: 6,
              paddingVertical: 8,
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Text style={{ color: '#dc2626', fontSize: 12, fontWeight: '500' }}>
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );

  const renderTemplateCard = (template: ScheduleTemplate) => (
    <Card key={template.id} variant="outlined" padding="md" style={{ marginBottom: 12 }}>
      <View style={{ gap: 12 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#18181b', marginBottom: 4 }}>
              {template.name}
            </Text>
            <Text style={{ fontSize: 12, color: '#6b7280' }}>
              {template.description || 'No description'}
            </Text>
          </View>
          <View style={{
            backgroundColor: '#10b981' + '20',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 12
          }}>
            <Text style={{ color: '#10b981', fontSize: 10, fontWeight: '500' }}>
              Template
            </Text>
          </View>
        </View>

        {/* Template Details */}
        <View style={{ backgroundColor: '#f9fafb', padding: 12, borderRadius: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
            Configuration
          </Text>
          <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
            Stops: {template.route_stops?.length || 0}
          </Text>
          <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
            Segments: {template.segments?.length || 0}
          </Text>
          <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
            Ticket Types: {template.ticket_type_configs?.length || 0}
          </Text>
          <Text style={{ fontSize: 12, color: '#6b7280' }}>
            Pricing: {template.pricing_tier}
          </Text>
        </View>

        {/* Actions */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => navigation.navigate('ScheduleWizard', { templateId: template.id })}
            style={{
              flex: 1,
              backgroundColor: '#18181b',
              borderRadius: 6,
              paddingVertical: 8,
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '600' }}>
              Use Template
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDeleteTemplate(template.id)}
            style={{
              backgroundColor: '#fef2f2',
              borderRadius: 6,
              paddingVertical: 8,
              paddingHorizontal: 12,
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <MaterialCommunityIcons name="delete" size={20} color="#dc2626" />
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );

  const renderContent = () => {
    if (activeTab === 'schedules') {
      return (
        <View>
          {/* Date Filter */}
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151' }}>
                Date Range
              </Text>

            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={() => handleDateFilterChange('today')}
                style={{
                  backgroundColor: dateFilter === 'today' ? '#18181b' : '#f3f4f6',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: dateFilter === 'today' ? '#18181b' : '#e5e7eb'
                }}
              >
                <Text style={{
                  fontSize: 12,
                  fontWeight: '500',
                  color: dateFilter === 'today' ? '#ffffff' : '#374151'
                }}>
                  Today
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => handleDateFilterChange('thisWeek')}
                style={{
                  backgroundColor: dateFilter === 'thisWeek' ? '#18181b' : '#f3f4f6',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: dateFilter === 'thisWeek' ? '#18181b' : '#e5e7eb'
                }}
              >
                <Text style={{
                  fontSize: 12,
                  fontWeight: '500',
                  color: dateFilter === 'thisWeek' ? '#ffffff' : '#374151'
                }}>
                  This Week
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => handleDateFilterChange('thisMonth')}
                style={{
                  backgroundColor: dateFilter === 'thisMonth' ? '#18181b' : '#f3f4f6',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: dateFilter === 'thisMonth' ? '#18181b' : '#e5e7eb'
                }}
              >
                <Text style={{
                  fontSize: 12,
                  fontWeight: '500',
                  color: dateFilter === 'thisMonth' ? '#ffffff' : '#374151'
                }}>
                  This Month
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => handleDateFilterChange('custom')}
                style={{
                  backgroundColor: dateFilter === 'custom' ? '#18181b' : '#f3f4f6',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: dateFilter === 'custom' ? '#18181b' : '#e5e7eb'
                }}
              >
                <Text style={{
                  fontSize: 12,
                  fontWeight: '500',
                  color: dateFilter === 'custom' ? '#ffffff' : '#374151'
                }}>
                  Custom
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Schedules List */}
          {schedules.length === 0 ? (
            <View style={{ padding: 32, alignItems: 'center' }}>
              <MaterialCommunityIcons name="calendar-blank" size={48} color="#d1d5db" />
              <Text style={{ fontSize: 16, color: '#6b7280', marginTop: 16, textAlign: 'center' }}>
                No schedules found for selected date range
              </Text>
              <Text style={{ fontSize: 14, color: '#9ca3af', marginTop: 8, textAlign: 'center' }}>
                Try changing the date filter or create a new schedule
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('ScheduleWizard')}
                style={{
                  backgroundColor: '#18181b',
                  borderRadius: 8,
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  marginTop: 16
                }}
              >
                <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '600' }}>
                  Create Schedule
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            schedules.map(renderScheduleCard)
          )}
        </View>
      );
    } else {
      if (templates.length === 0) {
        return (
          <View style={{ padding: 32, alignItems: 'center' }}>
            <MaterialCommunityIcons name="file-document-outline" size={48} color="#d1d5db" />
            <Text style={{ fontSize: 16, color: '#6b7280', marginTop: 16, textAlign: 'center' }}>
              No templates yet
            </Text>
            <Text style={{ fontSize: 14, color: '#9ca3af', marginTop: 8, textAlign: 'center' }}>
              Create a template to reuse schedule configurations
            </Text>
          </View>
        );
      }
      return templates.map(renderTemplateCard);
    }
  };

  if (loading) {
    return (
      <Surface variant="default" style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text variant="h6" color="secondary" style={{ fontSize: 14 }}>Loading schedules...</Text>
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
        onConfirm={handleCustomDateConfirm}
        initialStart={customStartDate}
        initialEnd={customEndDate}
        maximumDate={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)} // Max 1 year from now
      />
    </Surface>
  );
};
