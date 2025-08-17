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
import { Ionicons } from '@expo/vector-icons';

export type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Register: undefined;
  MainTabs: undefined;
  Dashboard: undefined;
  MyBoats: undefined;
  BookTickets: { scheduleId: number };
  AddBoat: undefined;
  EditBoat: { boatId: number };
  ViewBoat: { boatId: number };
  Settings: undefined;
  MyBookings: undefined;
};

export type MainTabParamList = {
  Schedules: undefined;
  Profile: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Schedules') {
            iconName = focused ? 'calendar' : 'calendar-outline';
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
      <Tab.Screen name="Schedules" component={SchedulesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const AppNavigator: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* Public screens - accessible without login */}
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        
        {/* Protected screens - require login */}
        {user ? (
          <>
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="MyBoats" component={MyBoatsScreen} />
            <Stack.Screen name="BookTickets" component={BookTicketsScreen} />
            <Stack.Screen name="AddBoat" component={AddBoatScreen} />
            <Stack.Screen name="EditBoat" component={EditBoatScreen} />
            <Stack.Screen name="ViewBoat" component={ViewBoatScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="MyBookings" component={MyBookingsScreen} />
          </>
        ) : null}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

// Placeholder screens - these will be created next
const AddBoatScreen = () => <></>;
const EditBoatScreen = () => <></>;
const ViewBoatScreen = () => <></>;
const SettingsScreen = () => <></>;
const MyBookingsScreen = () => <></>;

export default AppNavigator;
