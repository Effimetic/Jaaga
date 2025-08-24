import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../contexts/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import LoadingScreen from '../screens/LoadingScreen';
import DashboardScreen from '../screens/DashboardScreen';
import MyBoatsScreen from '../screens/MyBoatsScreen';
import BookTicketsScreen from '../screens/BookTicketsScreen';
import SchedulesScreen from '../screens/SchedulesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AddBoatScreen from '../screens/AddBoatScreen';
import EditBoatScreen from '../screens/EditBoatScreen';
import ViewBoatScreen from '../screens/ViewBoatScreen';
import SettingsScreen from '../screens/SettingsScreen';
import MyBookingsScreen from '../screens/MyBookingsScreen';
import { Ionicons } from '@expo/vector-icons';
import AgentOwnersScreen from '../screens/AgentOwnersScreen';
import AgentConnectionsScreen from '../screens/AgentConnectionsScreen';
import SearchScreen from '../screens/SearchScreen';
import BookingFlowScreen from '../screens/BookingFlowScreen';
import AgentDashboardScreen from '../screens/AgentDashboardScreen';
import MyTicketsScreen from '../screens/MyTicketsScreen';
import AgentAccountBookScreen from '../screens/AgentAccountBookScreen';
import RequestConnectionScreen from '../screens/RequestConnectionScreen';
import OwnerAccountBookScreen from '../screens/OwnerAccountBookScreen';
import AgentManagementScreen from '../screens/AgentManagementScreen';

export type RootStackParamList = {
  // Public Screens
  Home: undefined;
  Login: undefined;
  Register: undefined;
  Search: undefined;
  BookingFlow: { scheduleId: number; segmentId?: number };
  
  // Authenticated Screens
  MainTabs: undefined;
  Dashboard: undefined;
  MyTickets: undefined;
  MyBookings: undefined;
  Profile: undefined;
  
  // Agent Screens
  AgentDashboard: undefined;
  AgentConnections: undefined;
  AgentAccountBook: undefined;
  RequestConnection: undefined;
  
  // Owner Screens
  OwnerDashboard: undefined;
  MyBoats: undefined;
  BookTickets: { scheduleId: number };
  AddBoat: undefined;
  EditBoat: { boatId: number };
  ViewBoat: { boatId: number };
  Settings: undefined;
  ScheduleManagement: undefined;
  ViewSchedule: { scheduleId: number };
  CreateBooking: { scheduleId: number };
  OwnerSettings: undefined;
  ScheduleBookings: { scheduleId: number };
  IssueTicket: { bookingId: number };
  AgentManagement: undefined;
  OwnerAccountBook: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Bookings: undefined;
  Profile: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabNavigator: React.FC = () => {
  const { user } = useAuth();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Search') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Bookings') {
            iconName = focused ? 'ticket' : 'ticket-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen 
        name="Bookings" 
        component={user?.role === 'AGENT' ? AgentDashboardScreen : MyTicketsScreen} 
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const AppNavigator: React.FC = () => {
  const { user, isLoading } = useAuth();

  console.log('🔄 AppNavigator re-render - user:', user, 'isLoading:', isLoading);
  console.log('🔄 AppNavigator - user type:', typeof user, 'user value:', JSON.stringify(user));
  console.log('🔄 AppNavigator - user === null:', user === null);
  console.log('🔄 AppNavigator - user === undefined:', user === undefined);

  if (isLoading) {
    console.log('⏳ AppNavigator - showing LoadingScreen');
    return <LoadingScreen />;
  }

  console.log('🎯 AppNavigator - rendering main navigation');
  console.log('🎯 AppNavigator - user exists:', !!user);
  console.log('🎯 AppNavigator - showing protected routes:', !!user);
  
  // If no user, we should be showing public routes
  if (!user) {
    console.log('🌐 AppNavigator - showing public routes (no user)');
  } else {
    console.log('🔒 AppNavigator - showing protected routes (user logged in)');
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* Public screens - always accessible */}
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Search" component={SearchScreen} />
        <Stack.Screen name="BookingFlow" component={BookingFlowScreen} />
        
        {/* Protected screens - only shown when user is logged in */}
        {user ? (
          <>
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            
            {/* Common authenticated screens */}
            <Stack.Screen 
              name="Dashboard" 
              component={user.role === 'AGENT' ? AgentDashboardScreen : DashboardScreen} 
            />
            <Stack.Screen name="MyTickets" component={MyTicketsScreen} />
            <Stack.Screen name="MyBookings" component={MyBookingsScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            
            {/* Agent-specific screens */}
            {user.role === 'AGENT' && (
              <>
                <Stack.Screen name="AgentDashboard" component={AgentDashboardScreen} />
                <Stack.Screen name="AgentConnections" component={AgentConnectionsScreen} />
                <Stack.Screen name="AgentAccountBook" component={AgentAccountBookScreen} />
                <Stack.Screen name="RequestConnection" component={RequestConnectionScreen} />
              </>
            )}
            
            {/* Owner-specific screens */}
            {user.role === 'OWNER' && (
              <>
                <Stack.Screen name="OwnerDashboard" component={DashboardScreen} />
                <Stack.Screen name="AgentManagement" component={AgentManagementScreen} />
                <Stack.Screen name="OwnerAccountBook" component={OwnerAccountBookScreen} />
              </>
            )}
            
            {/* Boat management screens (Owner only) */}
            {user.role === 'OWNER' && (
              <>
                <Stack.Screen name="MyBoats" component={MyBoatsScreen} />
                <Stack.Screen name="AddBoat" component={AddBoatScreen} />
                <Stack.Screen name="EditBoat" component={EditBoatScreen} />
                <Stack.Screen name="ViewBoat" component={ViewBoatScreen} />
                <Stack.Screen name="ScheduleManagement" component={ScheduleManagementScreen} />
                <Stack.Screen name="ViewSchedule" component={ViewScheduleScreen} />
                <Stack.Screen name="CreateBooking" component={CreateBookingScreen} />
                <Stack.Screen name="OwnerSettings" component={OwnerSettingsScreen} />
                <Stack.Screen name="ScheduleBookings" component={ScheduleBookingsScreen} />
                <Stack.Screen name="IssueTicket" component={IssueTicketScreen} />
              </>
            )}
            
            {/* Legacy screens - keeping for backward compatibility */}
            <Stack.Screen name="MyBoats" component={MyBoatsScreen} />
            <Stack.Screen name="BookTickets" component={BookTicketsScreen} />
            <Stack.Screen name="AddBoat" component={AddBoatScreen} />
            <Stack.Screen name="EditBoat" component={EditBoatScreen} />
            <Stack.Screen name="ViewBoat" component={ViewBoatScreen} />
            <Stack.Screen name="ScheduleManagement" component={ScheduleManagementScreen} />
            <Stack.Screen name="ViewSchedule" component={ViewScheduleScreen} />
            <Stack.Screen name="CreateBooking" component={CreateBookingScreen} />
            <Stack.Screen name="OwnerSettings" component={OwnerSettingsScreen} />
            <Stack.Screen name="ScheduleBookings" component={ScheduleBookingsScreen} />
            <Stack.Screen name="IssueTicket" component={IssueTicketScreen} />
          </>
        ) : null}
      </Stack.Navigator>
    </NavigationContainer>
  );
};


export default AppNavigator;
