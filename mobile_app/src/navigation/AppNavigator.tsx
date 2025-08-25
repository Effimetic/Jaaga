import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';


// Import all screens
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
import SearchScreen from '../screens/SearchScreen';
import BookingFlowScreen from '../screens/BookingFlowScreen';
import AgentDashboardScreen from '../screens/AgentDashboardScreen';
import MyTicketsScreen from '../screens/MyTicketsScreen';
import AgentAccountBookScreen from '../screens/AgentAccountBookScreen';
import RequestConnectionScreen from '../screens/RequestConnectionScreen';
import OwnerAccountBookScreen from '../screens/OwnerAccountBookScreen';
import AgentManagementScreen from '../screens/AgentManagementScreen';
import ScheduleManagementScreen from '../screens/ScheduleManagementScreen';
import ViewScheduleScreen from '../screens/ViewScheduleScreen';
import CreateBookingScreen from '../screens/CreateBookingScreen';
import OwnerSettingsScreen from '../screens/OwnerSettingsScreen';
import ScheduleBookingsScreen from '../screens/ScheduleBookingsScreen';
import IssueTicketScreen from '../screens/IssueTicketScreen';
import AgentConnectionsScreen from '../screens/AgentConnectionsScreen';
import AgentOwnersScreen from '../screens/AgentOwnersScreen';

export type RootStackParamList = {
  // Public Screens
  Home: undefined;
  Login: undefined;
  Register: undefined;
  SearchScreen: undefined;
  BookingFlow: { scheduleId: number; segmentId?: number };
  
  // Authenticated Screens
  MainTabs: undefined;
  Dashboard: undefined;
  MyTickets: undefined;
  MyBookings: undefined;
  Profile: undefined;
  Settings: undefined;
  
  // Owner Screens
  MyBoats: undefined;
  BookTickets: { scheduleId: number };
  AddBoat: undefined;
  EditBoat: { boatId: number };
  ViewBoat: { boatId: number };
  Schedules: undefined;
  ScheduleManagement: undefined;
  ViewSchedule: { scheduleId: number };
  CreateBooking: { scheduleId: number };
  OwnerSettings: undefined;
  ScheduleBookings: { scheduleId: number };
  IssueTicket: { bookingId: number };
  AgentManagement: undefined;
  OwnerAccountBook: undefined;
  
  // Agent Screens
  AgentDashboard: undefined;
  AgentConnections: undefined;
  AgentOwners: undefined;
  RequestConnection: undefined;
  AgentAccountBook: undefined;
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
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number }) => {
          let iconName: string;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home';
          } else if (route.name === 'Search') {
            iconName = focused ? 'search' : 'search';
          } else if (route.name === 'Bookings') {
            iconName = focused ? 'ticket-alt' : 'ticket-alt';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'user' : 'user';
          } else {
            iconName = 'question';
          }

          return <FontAwesome5 name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#6B7280',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
          height: 80 + Math.max(insets.bottom, 8),
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen 
        name="Search" 
        component={SearchScreen}
        options={{ tabBarLabel: 'Search' }}
      />
      <Tab.Screen 
        name="Bookings" 
        component={MyBookingsScreen}
        options={{ tabBarLabel: 'Bookings' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator: React.FC = () => {
  const { user, isLoading } = useAuth();

  console.log('🔄 AppNavigator re-render - user:', user, 'isLoading:', isLoading);
  console.log('🔄 AppNavigator - user role:', user?.role);
  console.log('🔄 AppNavigator - user authenticated:', user?.authenticated);

  if (isLoading) {
    console.log('⏳ AppNavigator - showing LoadingScreen');
    return <LoadingScreen />;
  }

  console.log('🎯 AppNavigator - rendering main navigation');
  console.log('🎯 AppNavigator - user exists:', !!user);
  console.log('🎯 AppNavigator - initial route:', user ? "MainTabs" : "Home");
  
  return (
    <NavigationContainer>
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: false,
          gestureEnabled: true,
          cardStyleInterpolator: ({ current, layouts }) => {
            return {
              cardStyle: {
                transform: [
                  {
                    translateX: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [layouts.screen.width, 0],
                    }),
                  },
                ],
              },
            };
          },
        }}
        initialRouteName={user ? "MainTabs" : "Home"}
      >
        {/* Public screens - always accessible */}
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="SearchScreen" component={SearchScreen} />
        <Stack.Screen name="BookingFlow" component={BookingFlowScreen} />
        
        {/* Protected screens - only shown when user is logged in */}
        {user ? (
          <>
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            
            {/* Common authenticated screens */}
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="MyBookings" component={MyBookingsScreen} />
            <Stack.Screen name="MyTickets" component={MyTicketsScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="Schedules" component={SchedulesScreen} />
            
            {/* Agent-specific screens */}
            {(user.role === 'AGENT') && (
              <>
                <Stack.Screen name="AgentDashboard" component={AgentDashboardScreen} />
                <Stack.Screen name="AgentConnections" component={AgentConnectionsScreen} />
                <Stack.Screen name="AgentOwners" component={AgentOwnersScreen} />
                <Stack.Screen name="RequestConnection" component={RequestConnectionScreen} />
                <Stack.Screen name="AgentAccountBook" component={AgentAccountBookScreen} />
              </>
            )}
            
            {/* Owner-specific screens */}
            {(user.role === 'OWNER') && (
              <>
                <Stack.Screen name="MyBoats" component={MyBoatsScreen} />
                <Stack.Screen name="AddBoat" component={AddBoatScreen} />
                <Stack.Screen name="EditBoat" component={EditBoatScreen} />
                <Stack.Screen name="ViewBoat" component={ViewBoatScreen} />
                <Stack.Screen name="BookTickets" component={BookTicketsScreen} />
                <Stack.Screen name="ScheduleManagement" component={ScheduleManagementScreen} />
                <Stack.Screen name="ViewSchedule" component={ViewScheduleScreen} />
                <Stack.Screen name="CreateBooking" component={CreateBookingScreen} />
                <Stack.Screen name="OwnerSettings" component={OwnerSettingsScreen} />
                <Stack.Screen name="ScheduleBookings" component={ScheduleBookingsScreen} />
                <Stack.Screen name="IssueTicket" component={IssueTicketScreen} />
                <Stack.Screen name="AgentManagement" component={AgentManagementScreen} />
                <Stack.Screen name="OwnerAccountBook" component={OwnerAccountBookScreen} />
              </>
            )}
            
            {/* App Owner specific screens */}
            {(user.role === 'APP_OWNER') && (
              <>
                {/* Add app owner specific screens here */}
              </>
            )}
          </>
        ) : null}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;