import { MaterialCommunityIcons } from '@expo/vector-icons';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar, Card, Input, Surface, Text, TimePicker } from '../components/catalyst';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Boat,
  Destination,
  RouteStop,
  ScheduleWizardData,
  TicketType
} from '../types';

interface WizardStep {
  id: string;
  title: string;
  description: string;
}

const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'basic',
    title: 'Basic Information',
    description: 'Set schedule name, boat, and description'
  },
  {
    id: 'route',
    title: 'Route Planning',
    description: 'Define destinations and route stops with timing'
  },
  {
    id: 'recurrence',
    title: 'Schedule Dates',
    description: 'Choose when this schedule runs'
  },
  {
    id: 'tickets',
    title: 'Ticket Types',
    description: 'Select and configure ticket types for this schedule'
  },
  {
    id: 'template',
    title: 'Save Options',
    description: 'Save as template for future use'
  }
];

export const ScheduleWizardScreen: React.FC<{ navigation: any; route?: any }> = ({ navigation, route }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);

  const [formData, setFormData] = useState<ScheduleWizardData>({
    template_name: '',
    description: '',
    boat_id: '',
    route_stops: [], // Start with completely empty route stops
    recurrence_dates: [],
    selected_ticket_types: [],
    save_as_template: false,
    template_name_for_save: ''
  });

  // Debug: Log when formData changes
  useEffect(() => {
    console.log('FormData route_stops changed:', formData.route_stops);
  }, [formData.route_stops]);

  const loadTemplateData = useCallback(async (templateId: string) => {
    try {
      setLoading(true);
      
      // Load template data
      const { data: templateData, error: templateError } = await supabase
        .from('schedule_templates')
        .select('*')
        .eq('id', templateId)
        .eq('is_active', true)
        .single();

      if (templateError || !templateData) {
        Alert.alert('Error', 'Template not found or inactive');
        return;
      }

      // Populate form data with template data
      setFormData(prev => ({
        ...prev,
        template_name: templateData.name,
        description: templateData.description || '',
        boat_id: templateData.default_boat_id || prev.boat_id,
        route_stops: templateData.route_stops || [],
        selected_ticket_types: templateData.ticket_type_configs || [],
        recurrence_dates: [], // Start with empty dates - user will select new dates
        save_as_template: false, // Don't save as template when using a template
        template_name_for_save: ''
      }));

      console.log('Template loaded:', templateData);
    } catch (error) {
      console.error('Failed to load template:', error);
      Alert.alert('Error', 'Failed to load template data');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadInitialData = useCallback(async () => {
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

      // Load destinations (global table, no owner filtering)
      const { data: destData, error: destError } = await supabase
        .from('destinations')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (destError) {
        console.error('Failed to load destinations:', destError);
      } else {
        console.log('Loaded destinations:', destData?.length || 0, destData);
        setDestinations(destData || []);
        
        // Ensure route stops remain empty when destinations are loaded
        if (formData.route_stops.length === 0) {
          console.log('Route stops are empty, keeping them empty');
        } else {
          console.log('Route stops already exist, not auto-populating');
        }
      }

      // Load boats
      const { data: boatData, error: boatError } = await supabase
        .from('boats')
        .select('*')
        .eq('owner_id', ownerData.id)
        .eq('status', 'ACTIVE');

      if (boatError) {
        console.error('Failed to load boats:', boatError);
      } else {
        setBoats(boatData || []);
        if (boatData && boatData.length > 0 && !formData.boat_id) {
          setFormData(prev => ({ ...prev, boat_id: boatData[0].id }));
        }
      }

      // Load ticket types
      const { data: ticketData, error: ticketError } = await supabase
        .from('ticket_types')
        .select('*')
        .eq('owner_id', ownerData.id)
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (ticketError) {
        console.error('Failed to load ticket types:', ticketError);
      } else {
        setTicketTypes(ticketData || []);
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
      Alert.alert('Error', 'Failed to load destinations and boats');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Handle route parameters for editing or using templates
  useEffect(() => {
    const handleRouteParams = async () => {
      if (route?.params) {
        console.log('Route params received:', route.params);
        
        if (route.params.editScheduleId) {
          // TODO: Load existing schedule for editing
          setIsEditing(true);
          setEditingScheduleId(route.params.editScheduleId);
          console.log('Editing schedule:', route.params.editScheduleId);
        } else if (route.params.templateId) {
          // Load template for creating new schedule
          console.log('Using template:', route.params.templateId);
          await loadTemplateData(route.params.templateId);
        } else {
          console.log('No route params, starting fresh');
          // Ensure we start with empty route stops when no params
          if (formData.route_stops.length > 0) {
            console.log('Clearing existing route stops to start fresh');
            setFormData(prev => ({ ...prev, route_stops: [] }));
          }
        }
      }
    };

    handleRouteParams();
  }, [route?.params, loadTemplateData]);

  const updateForm = (field: keyof ScheduleWizardData, value: any) => {
    if (field === 'route_stops') {
      console.log('Updating route_stops:', value);
    }
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addRouteStop = () => {
    console.log('Adding new route stop. Current stops:', formData.route_stops.length);
    const isFirstStop = formData.route_stops.length === 0;
    const newStop: RouteStop = {
      id: Date.now().toString(),
      destination_id: '',
      name: '',
      order: formData.route_stops.length + 1,
      is_pickup: isFirstStop ? true : false, // First stop must be pickup
      is_dropoff: !isFirstStop, // Only first stop is not dropoff initially
      estimated_duration: 0,
      departure_time: '',
      arrival_time: ''
    };
    console.log('New stop created:', newStop);
    const updatedStops = [...formData.route_stops, newStop];
    updateForm('route_stops', updatedStops);
    
    // Ensure pickup/dropoff logic is maintained
    const finalStops = ensurePickupDropoffLogic(updatedStops);
    updateForm('route_stops', finalStops);
  };

  const ensurePickupDropoffLogic = (stops: RouteStop[]) => {
    if (stops.length === 0) return stops;
    
    const updatedStops = stops.map((stop, index) => {
      const updatedStop = { ...stop };
      
      // Update order field
      updatedStop.order = index + 1;
      
      // First stop must be pickup only
      if (index === 0) {
        updatedStop.is_pickup = true;
        updatedStop.is_dropoff = false;
      }
      // Last stop must be dropoff only
      else if (index === stops.length - 1) {
        updatedStop.is_pickup = false;
        updatedStop.is_dropoff = true;
      }
      // Middle stops can be both pickup and dropoff
      else {
        updatedStop.is_pickup = true;
        updatedStop.is_dropoff = true;
      }
      
      return updatedStop;
    });
    
    return updatedStops;
  };

  const generateSegmentsFromRouteStops = (routeStops: RouteStop[]) => {
    const segments = [];
    
    for (let i = 0; i < routeStops.length - 1; i++) {
      const currentStop = routeStops[i];
      const nextStop = routeStops[i + 1];
      
      segments.push({
        id: `segment_${i}`,
        from_stop_id: currentStop.id,
        to_stop_id: nextStop.id,
        from_stop_name: currentStop.name,
        to_stop_name: nextStop.name,
        departure_time: currentStop.departure_time || '',
        arrival_time: nextStop.arrival_time || '',
        estimated_duration: currentStop.estimated_duration || 0
      });
    }
    
    return segments;
  };

  const updateRouteStop = (index: number, field: keyof RouteStop, value: any) => {
    console.log('updateRouteStop called:', { index, field, value, currentStops: formData.route_stops.length });
    const updatedStops = [...formData.route_stops];
    updatedStops[index] = { ...updatedStops[index], [field]: value };
    
    // Update name when destination changes
    if (field === 'destination_id') {
      const destination = destinations.find(d => d.id === value);
      if (destination) {
        console.log('Found destination:', destination.name);
        updatedStops[index].name = destination.name;
      }
    }
    
    // Debug time updates
    if (field === 'departure_time' || field === 'arrival_time') {
      console.log(`Updated ${field} for stop ${index}:`, value);
      console.log('Updated stop:', updatedStops[index]);
    }
    
    console.log('Updated stops:', updatedStops);
    updateForm('route_stops', updatedStops);
    
    // Ensure pickup/dropoff logic is maintained after updates
    const finalStops = ensurePickupDropoffLogic(updatedStops);
    updateForm('route_stops', finalStops);
  };



  const removeRouteStop = (index: number) => {
    const updatedStops = formData.route_stops.filter((_, i) => i !== index);
    // Reorder stops
    updatedStops.forEach((stop, i) => {
      stop.order = i + 1;
    });
    updateForm('route_stops', updatedStops);
    
    // Ensure pickup/dropoff logic is maintained after removal
    const finalStops = ensurePickupDropoffLogic(updatedStops);
    updateForm('route_stops', finalStops);
  };





  const addRecurrenceDate = (date: string) => {
    if (!formData.recurrence_dates.includes(date)) {
      updateForm('recurrence_dates', [...formData.recurrence_dates, date]);
    }
  };

  const removeRecurrenceDate = (date: string) => {
    updateForm('recurrence_dates', formData.recurrence_dates.filter(d => d !== date));
  };

  const nextStep = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 0: // Basic Info
        if (!formData.template_name.trim() || !formData.boat_id) {
          Alert.alert('Validation Error', 'Please fill in all required fields');
          return false;
        }
        break;
      case 1: // Route Planning
        if (formData.route_stops.length < 2) {
          Alert.alert('Validation Error', 'Need at least 2 stops for a route');
          return false;
        }
        if (formData.route_stops.some(stop => !stop.destination_id)) {
          Alert.alert('Validation Error', 'Please select destinations for all stops');
          return false;
        }
        
        // Validate pickup/dropoff logic
        const hasPickup = formData.route_stops.some(stop => stop.is_pickup);
        const hasDropoff = formData.route_stops.some(stop => stop.is_dropoff);
        
        if (!hasPickup) {
          Alert.alert('Validation Error', 'At least one stop must allow pickup');
          return false;
        }
        
        if (!hasDropoff) {
          Alert.alert('Validation Error', 'At least one stop must allow dropoff');
          return false;
        }
        
        // Validate that first stop is pickup and last stop is dropoff
        if (formData.route_stops.length > 0) {
          const firstStop = formData.route_stops[0];
          const lastStop = formData.route_stops[formData.route_stops.length - 1];
          
          if (!firstStop.is_pickup) {
            Alert.alert('Validation Error', 'First stop must allow pickup');
            return false;
          }
          
          if (!lastStop.is_dropoff) {
            Alert.alert('Validation Error', 'Last stop must allow dropoff');
            return false;
          }
        }
        
        // Validate timing for pickup/dropoff stops
        console.log('Validating route stops:', formData.route_stops);
        
        // Helper function to check if time is valid
        const isValidTime = (time: string | undefined) => {
          if (!time) return false;
          const trimmed = time.trim();
          if (trimmed === '') return false;
          // Check if it's in HH:MM format
          const timeRegex = /^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;
          return timeRegex.test(trimmed);
        };
        
        const invalidStops = formData.route_stops.filter((stop, index) => {
          console.log('Checking stop:', { 
            index,
            name: stop.name, 
            is_pickup: stop.is_pickup, 
            is_dropoff: stop.is_dropoff,
            departure_time: stop.departure_time,
            arrival_time: stop.arrival_time,
            departure_valid: isValidTime(stop.departure_time),
            arrival_valid: isValidTime(stop.arrival_time)
          });
          
          // First stop (pickup only) needs departure time
          if (index === 0 && !isValidTime(stop.departure_time)) {
            console.log('First stop missing departure time:', stop.name, 'Time:', stop.departure_time);
            return true;
          }
          
          // Last stop (dropoff only) needs arrival time
          if (index === formData.route_stops.length - 1 && !isValidTime(stop.arrival_time)) {
            console.log('Last stop missing arrival time:', stop.name, 'Time:', stop.arrival_time);
            return true;
          }
          
          // Middle stops (both pickup and dropoff) need both times
          if (index > 0 && index < formData.route_stops.length - 1) {
            if (!isValidTime(stop.departure_time) || !isValidTime(stop.arrival_time)) {
              console.log('Middle stop missing times:', stop.name, 'Departure:', stop.departure_time, 'Arrival:', stop.arrival_time);
              return true;
            }
          }
          
          return false;
        });
        
        if (invalidStops.length > 0) {
          console.log('Invalid stops found:', invalidStops);
          Alert.alert('Validation Error', 'Please set all required times for each stop');
          return false;
        }
        break;
      case 2: // Schedule Dates
        if (formData.recurrence_dates.length === 0) {
          Alert.alert('Validation Error', 'Please select at least one date');
          return false;
        }
        break;
      case 3: // Ticket Types
        if (formData.selected_ticket_types.length === 0) {
          Alert.alert('Validation Error', 'Please select at least one ticket type');
          return false;
        }
        break;
    }
    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      nextStep();
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;

    try {
      setSaving(true);
      
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

      // Generate segments from route stops
      const segments = generateSegmentsFromRouteStops(formData.route_stops);
      
      // Save as template if requested
      if (formData.save_as_template && formData.template_name_for_save) {
        const templateData = {
          owner_id: ownerData.id,
          name: formData.template_name_for_save,
          description: formData.description,
          route_stops: formData.route_stops,
          segments: segments,
          default_boat_id: formData.boat_id,
          pricing_tier: 'STANDARD',
          ticket_type_configs: formData.selected_ticket_types
        };

        const { error: templateError } = await supabase
          .from('schedule_templates')
          .insert([templateData]);

        if (templateError) {
          console.error('Failed to save template:', templateError);
        }
      }

      // Create schedules for each recurrence date
      for (const date of formData.recurrence_dates) {
        const scheduleData = {
          owner_id: ownerData.id,
          boat_id: formData.boat_id,
          template_name: formData.template_name,
          start_at: new Date(`${date}T${segments[0].departure_time}`).toISOString(),
          segments: segments.map(seg => ({
            ...seg,
            departure_time: new Date(`${date}T${seg.departure_time}`).toISOString(),
            arrival_time: new Date(`${date}T${seg.arrival_time}`).toISOString(),
          })),
          status: 'ACTIVE',
          inherits_pricing: true
        };

        const { data: createdSchedule, error: scheduleError } = await supabase
          .from('schedules')
          .insert([scheduleData])
          .select()
          .single();

        if (scheduleError) {
          console.error('Failed to create schedule:', scheduleError);
          throw new Error('Failed to create schedule');
        }

        // Create schedule ticket types
        if (createdSchedule && formData.selected_ticket_types.length > 0) {
          const scheduleTicketTypes = formData.selected_ticket_types.map(st => ({
            schedule_id: createdSchedule.id,
            ticket_type_id: st.ticket_type_id,
            active: st.active,
            price_override: st.price_override
          }));

          const { error: ticketTypeError } = await supabase
            .from('schedule_ticket_types')
            .insert(scheduleTicketTypes);

          if (ticketTypeError) {
            console.error('Failed to create schedule ticket types:', ticketTypeError);
            throw new Error('Failed to create schedule ticket types');
          }
        }
      }

      Alert.alert('Success', 'Schedule created successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('MySchedules')
        }
      ]);
    } catch (error: any) {
      console.error('Failed to save schedule:', error);
      Alert.alert('Error', error.message || 'Failed to save schedule');
    } finally {
      setSaving(false);
    }
  };

  const renderBasicInfo = () => (
    <View style={{ gap: 16 }}>
      <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>
        Destinations are global and managed by the app owner. Boats are loaded from your database. Make sure you have destinations set up before creating schedules.
      </Text>
      
      <Input
        label="Schedule Name *"
        value={formData.template_name}
        onChangeText={(text: string) => updateForm('template_name', text)}
        placeholder="e.g., Daily Male to Maafushi"
        style={{
          fontSize: 14,
          paddingVertical: 12,
          paddingHorizontal: 16,
        }}
      />

      <Input
        label="Description"
        value={formData.description}
        onChangeText={(text: string) => updateForm('description', text)}
        placeholder="Optional description of this schedule"
        style={{
          fontSize: 14,
          paddingVertical: 12,
          paddingHorizontal: 16,
        }}
      />

      {/* Boat Selection */}
      <View>
        <Text style={{ 
          fontSize: 12, 
          fontWeight: '500', 
          marginBottom: 8,
          color: '#374151'
        }}>
          Select Boat *
        </Text>
        <View style={{ gap: 8 }}>
          {boats.map((boat) => (
            <TouchableOpacity
              key={boat.id}
              onPress={() => updateForm('boat_id', boat.id)}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: formData.boat_id === boat.id ? '#18181b' : '#d1d5db',
                backgroundColor: formData.boat_id === boat.id ? '#18181b' + '10' : '#ffffff',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons 
                  name="ferry" 
                  size={20} 
                  color={formData.boat_id === boat.id ? '#18181b' : '#6b7280'} 
                  style={{ marginRight: 12 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: formData.boat_id === boat.id ? '#18181b' : '#374151',
                    marginBottom: 2
                  }}>
                    {boat.name}
                  </Text>
                  <Text style={{
                    fontSize: 12,
                    color: formData.boat_id === boat.id ? '#18181b' : '#6b7280'
                  }}>
                    Capacity: {boat.capacity} • {boat.seat_mode}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderRoutePlanning = () => (
    <View style={{ gap: 16 }}>
      <Text style={{ fontSize: 16, fontWeight: '600', color: '#18181b' }}>
        Route Stops ({formData.route_stops.length})
      </Text>
      
      <Text style={{ fontSize: 14, color: '#6b7280' }}>
        Select destinations from the global destinations list and configure pickup/dropoff options for each stop. Destinations are managed by the app owner.
      </Text>
      


      {formData.route_stops.map((stop, index) => (
        <Card key={stop.id} variant="outlined" padding="md">
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#18181b' }}>
                Stop {stop.order}
              </Text>
              <TouchableOpacity
                onPress={() => removeRouteStop(index)}
                style={{ padding: 4 }}
              >
                <MaterialCommunityIcons name="delete" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>

            {/* Destination Selection */}
            <View>
              <Text style={{ fontSize: 12, fontWeight: '500', marginBottom: 8, color: '#374151' }}>
                Destination *
              </Text>
              
              {/* Destination Selection Button - Only show if no destination is selected */}
              {!stop.destination_id ? (
                <TouchableOpacity
                  onPress={() => {
                    console.log('Opening destination list for stop:', index);
                    navigation.navigate('DestinationList', {
                      stopIndex: index,
                      selectedDestinationId: stop.destination_id,
                      onDestinationSelect: (destination: Destination) => {
                        console.log('Destination selected in callback:', destination.name, destination.id);
                        // Update the route stop with the selected destination
                        const updatedStops = [...formData.route_stops];
                        updatedStops[index] = { 
                          ...updatedStops[index], 
                          destination_id: destination.id,
                          name: destination.name
                        };
                        console.log('Updated stops with destination:', updatedStops);
                        setFormData(prev => ({ ...prev, route_stops: updatedStops }));
                      }
                    });
                  }}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderWidth: 1,
                    borderColor: '#d1d5db',
                    borderRadius: 8,
                    backgroundColor: '#ffffff',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialCommunityIcons name="map-marker" size={20} color="#6b7280" style={{ marginRight: 12 }} />
                    <Text style={{ fontSize: 14, color: '#6b7280' }}>
                      Select Destination
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#6b7280" />
                </TouchableOpacity>
              ) : (
                <View style={{
                  padding: 12,
                  backgroundColor: '#f3f4f6',
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#d1d5db'
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <View style={{ 
                        width: 32, 
                        height: 32, 
                        borderRadius: 16, 
                        backgroundColor: '#ffffff',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 12
                      }}>
                        {(() => {
                          const selectedDest = destinations.find(d => d.id === stop.destination_id);
                          return selectedDest?.photo_url ? (
                            <Image 
                              source={{ uri: selectedDest.photo_url }} 
                              style={{ width: 32, height: 32, borderRadius: 24 }}
                              resizeMode="cover"
                            />
                          ) : (
                            <MaterialCommunityIcons name="map-marker" size={16} color="#10b981" />
                          );
                        })()}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{
                          fontSize: 14,
                          fontWeight: '600',
                          color: '#18181b',
                          marginBottom: 2
                        }}>
                          {destinations.find(d => d.id === stop.destination_id)?.name}
                        </Text>
                        <Text style={{
                          fontSize: 12,
                          color: '#6b7280'
                        }}>
                          {destinations.find(d => d.id === stop.destination_id)?.address}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        updateRouteStop(index, 'destination_id', '');
                        updateRouteStop(index, 'name', '');
                      }}
                      style={{ padding: 4, marginLeft: 8 }}
                    >
                      <MaterialCommunityIcons name="close-circle" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* Pickup/Dropoff Status (Read-only) */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{
                flex: 1,
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: stop.is_pickup ? '#10b981' : '#d1d5db',
                backgroundColor: stop.is_pickup ? '#10b98110' : '#f3f4f6',
                alignItems: 'center'
              }}>
                <Text style={{
                  fontSize: 12,
                  fontWeight: '500',
                  color: stop.is_pickup ? '#10b981' : '#6b7280'
                }}>
                  {stop.is_pickup ? '✓ Pickup' : 'No Pickup'}
                </Text>
              </View>

              <View style={{
                flex: 1,
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: stop.is_dropoff ? '#10b981' : '#d1d5db',
                backgroundColor: stop.is_dropoff ? '#10b98110' : '#f3f4f6',
                alignItems: 'center'
              }}>
                <Text style={{
                  fontSize: 12,
                  fontWeight: '500',
                  color: stop.is_dropoff ? '#10b981' : '#6b7280'
                }}>
                  {stop.is_dropoff ? '✓ Dropoff' : 'No Dropoff'}
                </Text>
              </View>
            </View>

            {/* Time Configuration - Show times based on stop type */}
            <View style={{ gap: 12 }}>
              {stop.is_pickup && (
                <View>
                  <TimePicker
                    label={index === 0 ? "Departure Time (First Stop)" : "Departure Time"}
                    value={stop.departure_time}
                    onChange={(time) => updateRouteStop(index, 'departure_time', time)}
                    placeholder="08:00"
                    required={true}
                  />
                </View>
              )}

              {stop.is_dropoff && (
                <View>
                  <TimePicker
                    label={index === formData.route_stops.length - 1 ? "Arrival Time (Final Stop)" : "Arrival Time"}
                    value={stop.arrival_time}
                    onChange={(time) => updateRouteStop(index, 'arrival_time', time)}
                    placeholder="09:00"
                    required={index === formData.route_stops.length - 1} // Final stop arrival time is required
                  />
                </View>
              )}
            </View>
          </View>
        </Card>
        
      ))}
      
      {/* Add Stop Button at the end */}
      <TouchableOpacity
        onPress={addRouteStop}
        style={{
          backgroundColor: '#f3f4f6',
          borderRadius: 8,
          paddingVertical: 12,
          paddingHorizontal: 16,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: '#d1d5db',
          borderStyle: 'dashed'
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MaterialCommunityIcons name="plus" size={16} color="#6b7280" style={{ marginRight: 8 }} />
          <Text style={{ fontSize: 14, color: '#6b7280', fontWeight: '500' }}>
            Add Next Stop
          </Text>
        </View>
      </TouchableOpacity>


    </View>
  );

  

  const renderScheduleDates = () => (
    <View style={{ gap: 16 }}>
      <Text style={{ fontSize: 16, fontWeight: '600', color: '#18181b' }}>
        Select Schedule Dates
      </Text>

      <Text style={{ fontSize: 14, color: '#6b7280' }}>
        Choose the specific dates when this schedule should run
      </Text>

      {/* Calendar for Date Selection */}
      <Calendar
        selectedDates={formData.recurrence_dates}
        onDateSelect={(date) => addRecurrenceDate(date)}
        onDateDeselect={(date) => removeRecurrenceDate(date)}
      />

      {/* Selected Dates */}
      <View>
        <Text style={{ fontSize: 12, fontWeight: '500', marginBottom: 8, color: '#374151' }}>
          Selected Dates ({formData.recurrence_dates.length})
        </Text>
        <View style={{ gap: 8 }}>
          {formData.recurrence_dates.map((date, index) => (
            <View key={index} style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 12,
              paddingHorizontal: 16,
              backgroundColor: '#f9fafb',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#e5e7eb'
            }}>
              <Text style={{ fontSize: 14, color: '#374151' }}>
                {new Date(date).toLocaleDateString()}
              </Text>
              <TouchableOpacity
                onPress={() => removeRecurrenceDate(date)}
                style={{ padding: 4 }}
              >
                <MaterialCommunityIcons name="close" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  const renderTicketTypes = () => (
    <View style={{ gap: 16 }}>
      <Text style={{ fontSize: 16, fontWeight: '600', color: '#18181b' }}>
        Select Ticket Types
      </Text>

      <Text style={{ fontSize: 14, color: '#6b7280' }}>
        Choose the ticket types that will be available for this schedule.
      </Text>

      {/* Ticket Type Selection */}
      <View style={{ gap: 12 }}>
        {ticketTypes.map((ticketType) => {
          const isSelected = formData.selected_ticket_types.some(st => st.ticket_type_id === ticketType.id);
          const selectedTicket = formData.selected_ticket_types.find(st => st.ticket_type_id === ticketType.id);
          
          return (
            <Card key={ticketType.id} variant="outlined" padding="md">
              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#18181b' }}>
                      {ticketType.name}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#6b7280' }}>
                      Code: {ticketType.code} • Base Price: {ticketType.base_price} {ticketType.currency}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      const updatedSelectedTypes = isSelected
                        ? formData.selected_ticket_types.filter(st => st.ticket_type_id !== ticketType.id)
                        : [...formData.selected_ticket_types, {
                            ticket_type_id: ticketType.id,
                            price_override: undefined,
                            active: true
                          }];
                      updateForm('selected_ticket_types', updatedSelectedTypes);
                    }}
                    style={{
                      padding: 8,
                      borderRadius: 8,
                      backgroundColor: isSelected ? '#10b98110' : '#f3f4f6',
                      borderWidth: 1,
                      borderColor: isSelected ? '#10b981' : '#d1d5db'
                    }}
                  >
                    <MaterialCommunityIcons name="check-circle" size={20} color={isSelected ? '#10b981' : '#6b7280'} />
                  </TouchableOpacity>
                </View>
                
                {isSelected && (
                  <View style={{ gap: 8 }}>
                    <Input
                      label="Price Override (Optional)"
                      value={selectedTicket?.price_override?.toString() || ''}
                      onChangeText={(text: string) => {
                        const price = text ? parseFloat(text) : undefined;
                        const updatedSelectedTypes = formData.selected_ticket_types.map(st => 
                          st.ticket_type_id === ticketType.id 
                            ? { ...st, price_override: price }
                            : st
                        );
                        updateForm('selected_ticket_types', updatedSelectedTypes);
                      }}
                      placeholder={`${ticketType.base_price} (base price)`}
                      keyboardType="numeric"
                      style={{
                        fontSize: 14,
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                      }}
                    />
                  </View>
                )}
              </View>
            </Card>
          );
        })}
      </View>
    </View>
  );

  const renderTemplateOptions = () => (
    <View style={{ gap: 16 }}>
      <Text style={{ fontSize: 16, fontWeight: '600', color: '#18181b' }}>
        Save Options
      </Text>

      {/* Save as Template Toggle */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 14, color: '#374151' }}>
          Save as Template
        </Text>
        <TouchableOpacity
          onPress={() => updateForm('save_as_template', !formData.save_as_template)}
          style={{
            width: 50,
            height: 30,
            borderRadius: 15,
            backgroundColor: formData.save_as_template ? '#10b981' : '#d1d5db',
            alignItems: formData.save_as_template ? 'flex-end' : 'flex-start',
            justifyContent: 'center',
            paddingHorizontal: 2
          }}
        >
          <View style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: '#ffffff',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 2,
            elevation: 2
          }} />
        </TouchableOpacity>
      </View>

      {formData.save_as_template && (
        <Input
          label="Template Name"
          value={formData.template_name_for_save}
          onChangeText={(text: string) => updateForm('template_name_for_save', text)}
          placeholder="e.g., Daily Male to Maafushi"
          style={{
            fontSize: 14,
            paddingVertical: 12,
            paddingHorizontal: 16,
          }}
        />
      )}

      <Text style={{ fontSize: 14, color: '#6b7280' }}>
        Templates can be reused to quickly create similar schedules in the future
      </Text>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return renderBasicInfo();
      case 1:
        return renderRoutePlanning();
      case 2:
        return renderScheduleDates();
      case 3:
        return renderTicketTypes();
      case 4:
        return renderTemplateOptions();
      default:
        return null;
    }
  };

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
            {isEditing ? 'Edit Schedule' : 'Create New Schedule'}
          </Text>
          <Text color="secondary" style={{ 
            marginTop: 4, 
            fontSize: 14,
            color: '#71717a'
          }}>
            {WIZARD_STEPS[currentStep].description}
          </Text>
        </View>

        {/* Progress Steps */}
        <View style={{ padding: 16, paddingTop: 8 }}>
          <View style={{ flexDirection: 'row', marginBottom: 20 }}>
            {WIZARD_STEPS.map((step, index) => (
              <View key={step.id} style={{ flex: 1, alignItems: 'center' }}>
                <View style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: index <= currentStep ? '#18181b' : '#e5e7eb',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 8
                }}>
                  {index < currentStep ? (
                    <MaterialCommunityIcons name="check" size={20} color="#ffffff" />
                  ) : (
                    <Text style={{
                      color: index === currentStep ? '#ffffff' : '#6b7280',
                      fontSize: 14,
                      fontWeight: '600'
                    }}>
                      {index + 1}
                    </Text>
                  )}
                </View>
                <Text style={{
                  fontSize: 10,
                  color: index <= currentStep ? '#18181b' : '#6b7280',
                  textAlign: 'center',
                  fontWeight: index === currentStep ? '600' : '400'
                }}>
                  {step.title}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Step Content */}
        <View style={{ padding: 16, paddingTop: 0 }}>
          <Card variant="elevated" padding="md">
            {renderCurrentStep()}
          </Card>
        </View>

        {/* Navigation Buttons */}
        <View style={{ padding: 16, paddingTop: 0 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {currentStep > 0 && (
              <TouchableOpacity
                onPress={prevStep}
                style={{
                  flex: 1,
                  backgroundColor: 'transparent',
                  borderWidth: 1,
                  borderColor: '#d1d5db',
                  borderRadius: 8,
                  paddingVertical: 12,
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Text style={{ 
                  color: '#71717a', 
                  fontSize: 14, 
                  fontWeight: '600' 
                }}>
                  Previous
                </Text>
              </TouchableOpacity>
            )}

            {currentStep < WIZARD_STEPS.length - 1 ? (
              <TouchableOpacity
                onPress={handleNext}
                style={{
                  flex: 1,
                  backgroundColor: '#18181b',
                  borderRadius: 8,
                  paddingVertical: 12,
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Text style={{ 
                  color: '#ffffff', 
                  fontSize: 14, 
                  fontWeight: '600' 
                }}>
                  Next
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                style={{
                  flex: 1,
                  backgroundColor: '#18181b',
                  borderRadius: 8,
                  paddingVertical: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: saving ? 0.6 : 1
                }}
              >
                <Text style={{ 
                  color: '#ffffff', 
                  fontSize: 14, 
                  fontWeight: '600' 
                }}>
                  {saving ? 'Creating...' : 'Create Schedule'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </Surface>
  );
};
