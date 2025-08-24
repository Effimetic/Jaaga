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

export type RootStackParamList = {
  // Public Screens
  Home: undefined;
  Login: undefined;
  Register: undefined;
  
  // Authenticated Screens
  MainTabs: undefined;
  Dashboard: undefined;
  MyTickets: undefined;
  MyBookings: undefined;
  Profile: undefined;
  
  // Owner Screens
  MyBoats: undefined;
  BookTickets: { scheduleId: number };
  AddBoat: undefined;
  EditBoat: { boatId: number };
  ViewBoat: { boatId: number };
  Settings: undefined;
  Schedules: undefined;
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
      <Tab.Screen name="Search" component={HomeScreen} />
      <Tab.Screen name="Bookings" component={MyBookingsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const AppNavigator: React.FC = () => {
  const { user, isLoading } = useAuth();

  console.log('🔄 AppNavigator re-render - user:', user, 'isLoading:', isLoading);

  if (isLoading) {
    console.log('⏳ AppNavigator - showing LoadingScreen');
    return <LoadingScreen />;
  }

  console.log('🎯 AppNavigator - rendering main navigation');
  console.log('🎯 AppNavigator - user exists:', !!user);
  
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* Public screens - always accessible */}
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        
        {/* Protected screens - only shown when user is logged in */}
        {user ? (
          <>
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            
            {/* Common authenticated screens */}
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="MyBookings" component={MyBookingsScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="Schedules" component={SchedulesScreen} />
            
            {/* Owner-specific screens */}
            {user.role === 'owner' && (
              <>
                <Stack.Screen name="MyBoats" component={MyBoatsScreen} />
                <Stack.Screen name="AddBoat" component={AddBoatScreen} />
                <Stack.Screen name="EditBoat" component={EditBoatScreen} />
                <Stack.Screen name="ViewBoat" component={ViewBoatScreen} />
                <Stack.Screen name="BookTickets" component={BookTicketsScreen} />
              </>
            )}
          </>
        ) : null}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;