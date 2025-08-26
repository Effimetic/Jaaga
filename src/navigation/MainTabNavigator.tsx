import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { colors, theme } from '../theme/theme';

// Import screens
import { BookingFlowScreen } from '../screens/BookingFlowScreen';
// import { HomeScreen } from '../screens/HomeScreen';
import { AddBoatScreen } from '../screens/AddBoatScreen';
import { AgentCommissionsScreen } from '../screens/AgentCommissionsScreen';
import { AgentConnectionsScreen } from '../screens/AgentConnectionsScreen';
import { AgentDashboardScreen } from '../screens/AgentDashboardScreen';
import { CreditHistoryScreen } from '../screens/CreditHistoryScreen';
import { FindOwnersScreen } from '../screens/FindOwnersScreen';
import { MyBoatsScreen } from '../screens/MyBoatsScreen';
import { MyTicketsScreen } from '../screens/MyTicketsScreen';
import { OwnerDashboardScreen } from '../screens/OwnerDashboardScreen';
import { OwnerFinancialsScreen } from '../screens/OwnerFinancialsScreen';
import {
    MyBookingsScreen,
    ProfileScreen
} from '../screens/PlaceholderScreens';
import { SearchScreen } from '../screens/SearchScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Home Stack Navigator - Always shows Search
function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="HomeMain" 
        component={SearchScreen}
        options={{ 
          title: '🚢 Search Boats',
          headerStyle: { backgroundColor: theme.colors.primary },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: 'bold' }
        }}
      />
      <Stack.Screen 
        name="BookingFlow" 
        component={BookingFlowScreen}
        options={{ 
          title: 'Book Tickets',
          headerStyle: { backgroundColor: theme.colors.primary },
          headerTintColor: '#ffffff',
        }}
      />
    </Stack.Navigator>
  );
}

// Search Stack Navigator
function SearchStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="SearchMain" 
        component={SearchScreen}
        options={{ 
          title: 'Search Trips',
          headerStyle: { backgroundColor: theme.colors.primary },
          headerTintColor: theme.colors.onPrimary,
        }}
      />
    </Stack.Navigator>
  );
}

// Tickets Stack Navigator
function TicketsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="MyTicketsMain" 
        component={MyTicketsScreen}
        options={{ 
          title: 'My Tickets',
          headerStyle: { backgroundColor: theme.colors.primary },
          headerTintColor: theme.colors.onPrimary,
        }}
      />
    </Stack.Navigator>
  );
}

// Bookings Stack Navigator
function BookingsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="MyBookingsMain" 
        component={MyBookingsScreen}
        options={{ 
          title: 'My Bookings',
          headerStyle: { backgroundColor: theme.colors.primary },
          headerTintColor: theme.colors.onPrimary,
        }}
      />
    </Stack.Navigator>
  );
}

// Agent Dashboard Stack
function AgentStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="AgentDashboardMain" 
        component={AgentDashboardScreen}
        options={{ 
          title: '🎯 Agent Portal',
          headerStyle: { backgroundColor: colors.agent },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: 'bold' }
        }}
      />
      <Stack.Screen 
        name="FindOwners" 
        component={FindOwnersScreen} 
        options={{ 
          title: 'Find Boat Owners',
          headerStyle: { backgroundColor: colors.agent },
          headerTintColor: '#ffffff',
        }} 
      />
      <Stack.Screen 
        name="AgentConnections" 
        component={AgentConnectionsScreen} 
        options={{ 
          title: 'My Connections',
          headerStyle: { backgroundColor: colors.agent },
          headerTintColor: '#ffffff',
        }} 
      />
      <Stack.Screen 
        name="CreditHistory" 
        component={CreditHistoryScreen} 
        options={{ 
          title: 'Credit History',
          headerStyle: { backgroundColor: colors.agent },
          headerTintColor: '#ffffff',
        }} 
      />
      <Stack.Screen 
        name="AgentCommissions" 
        component={AgentCommissionsScreen} 
        options={{ 
          title: 'My Commissions',
          headerStyle: { backgroundColor: colors.agent },
          headerTintColor: '#ffffff',
        }} 
      />
    </Stack.Navigator>
  );
}

// Owner Dashboard Stack
function OwnerStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="OwnerDashboardMain" 
        component={OwnerDashboardScreen}
        options={{ 
          title: '⚓ Owner Portal',
          headerStyle: { backgroundColor: colors.owner },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: 'bold' }
        }}
      />
      <Stack.Screen 
        name="MyBoats" 
        component={MyBoatsScreen} 
        options={{ 
          title: 'My Boats',
          headerStyle: { backgroundColor: colors.owner },
          headerTintColor: '#ffffff',
        }} 
      />
      <Stack.Screen 
        name="AddBoat" 
        component={AddBoatScreen} 
        options={{ 
          title: 'Add Boat',
          headerStyle: { backgroundColor: colors.owner },
          headerTintColor: '#ffffff',
        }} 
      />
      <Stack.Screen 
        name="EditBoat" 
        component={AddBoatScreen} 
        options={{ 
          title: 'Edit Boat',
          headerStyle: { backgroundColor: colors.owner },
          headerTintColor: '#ffffff',
        }} 
      />
      <Stack.Screen 
        name="OwnerFinancials" 
        component={OwnerFinancialsScreen} 
        options={{ 
          title: 'Financial Reports',
          headerStyle: { backgroundColor: colors.owner },
          headerTintColor: '#ffffff',
        }} 
      />
    </Stack.Navigator>
  );
}

// Profile Stack Navigator
function ProfileStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="ProfileMain" 
        component={ProfileScreen}
        options={{ 
          title: 'Profile',
          headerStyle: { backgroundColor: theme.colors.primary },
          headerTintColor: theme.colors.onPrimary,
        }}
      />
    </Stack.Navigator>
  );
}

export function MainTabNavigator() {
  const { user } = useAuth();

  const getTabBarIcon = (routeName: string, focused: boolean, color: string, size: number) => {
    let iconName: keyof typeof MaterialCommunityIcons.glyphMap = 'help';

    switch (routeName) {
      case 'Home':
        iconName = focused ? 'home' : 'home-outline';
        break;
      case 'Search':
        iconName = focused ? 'magnify' : 'magnify';
        break;
      case 'Tickets':
        iconName = focused ? 'ticket' : 'ticket-outline';
        break;
      case 'Bookings':
        iconName = focused ? 'book-open' : 'book-outline';
        break;
      case 'Agent':
        iconName = focused ? 'account-tie' : 'account-tie-outline';
        break;
      case 'Owner':
        iconName = focused ? 'ferry' : 'ferry';
        break;
      case 'Profile':
        iconName = focused ? 'account' : 'account-outline';
        break;
    }

    return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
  };

  // Get tabs based on user role
  const getTabsForUser = () => {
    const baseTabs = [
      <Tab.Screen 
        key="Home"
        name="Home" 
        component={HomeStack}
        options={{ tabBarLabel: 'Search' }}
      />
    ];

    // Add role-specific tabs
    if (user?.role === 'PUBLIC') {
      baseTabs.push(
        <Tab.Screen 
          key="Tickets"
          name="Tickets" 
          component={TicketsStack}
          options={{ tabBarLabel: 'My Tickets' }}
        />,
        <Tab.Screen 
          key="Bookings"
          name="Bookings" 
          component={BookingsStack}
          options={{ tabBarLabel: 'Bookings' }}
        />
      );
    } else if (user?.role === 'AGENT') {
      baseTabs.push(
        <Tab.Screen 
          key="Agent"
          name="Agent" 
          component={AgentStack}
          options={{ 
            tabBarLabel: 'Dashboard',
            tabBarActiveTintColor: colors.agent,
          }}
        />
      );
    } else if (user?.role === 'OWNER') {
      baseTabs.push(
        <Tab.Screen 
          key="Owner"
          name="Owner" 
          component={OwnerStack}
          options={{ 
            tabBarLabel: 'Dashboard',
            tabBarActiveTintColor: colors.owner,
          }}
        />
      );
    }

    // Always add Profile tab
    baseTabs.push(
      <Tab.Screen 
        key="Profile"
        name="Profile" 
        component={ProfileStack}
        options={{ tabBarLabel: 'Profile' }}
      />
    );

    return baseTabs;
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => 
          getTabBarIcon(route.name, focused, color, size),
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
        },
        headerShown: false,
      })}
    >
      {getTabsForUser()}
    </Tab.Navigator>
  );
}
