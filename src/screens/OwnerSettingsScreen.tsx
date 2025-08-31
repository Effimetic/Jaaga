import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import {
  ScrollView,
  TouchableOpacity,
  View
} from 'react-native';
import { Card, Surface, Text } from '../components/catalyst';

interface SettingsItem {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  route: string;
  color: string;
}

const SETTINGS_ITEMS: SettingsItem[] = [
  {
    id: 'brand',
    title: 'Brand & Logo',
    description: 'Set your brand name and upload company logo',
    icon: 'store',
    route: 'BrandSettings',
    color: '#3b82f6'
  },
  {
    id: 'tax',
    title: 'Tax Configuration',
    description: 'Configure tax rates and rules for your business',
    icon: 'percent',
    route: 'TaxSettings',
    color: '#10b981'
  },
  {
    id: 'tickets',
    title: 'Ticket Types',
    description: 'Manage ticket types and pricing for your routes',
    icon: 'ticket',
    route: 'TicketTypeSettings',
    color: '#f59e0b'
  },
  {
    id: 'schedules',
    title: 'Schedule Management',
    description: 'Manage boat schedules and routes',
    icon: 'calendar-clock',
    route: 'MySchedules',
    color: '#8b5cf6'
  },
  {
    id: 'payments',
    title: 'Payment Methods',
    description: 'Configure accepted payment methods',
    icon: 'credit-card',
    route: 'PaymentSettings',
    color: '#f59e0b'
  },
  {
    id: 'gateway',
    title: 'BML Gateway',
    description: 'Configure BML 3D Secure payment gateway',
    icon: 'shield-check',
    route: 'GatewaySettings',
    color: '#ef4444'
  },
  {
    id: 'bank',
    title: 'Bank Accounts',
    description: 'Manage your bank accounts for settlements',
    icon: 'bank',
    route: 'BankAccountSettings',
    color: '#06b6d4'
  }
];

export const OwnerSettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const handleSettingsPress = (item: SettingsItem) => {
    navigation.navigate(item.route);
  };

  const renderSettingsItem = (item: SettingsItem) => (
    <TouchableOpacity
      key={item.id}
      onPress={() => handleSettingsPress(item)}
      style={{ marginBottom: 12 }}
    >
      <Card variant="elevated" padding="md">
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Icon */}
          <View style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: item.color + '20',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 16
          }}>
            <MaterialCommunityIcons
              name={item.icon}
              size={24}
              color={item.color}
            />
          </View>

          {/* Content */}
          <View style={{ flex: 1 }}>
            <Text variant="h6" color="primary" style={{ 
              fontSize: 16, 
              fontWeight: '600', 
              marginBottom: 4,
              color: '#111827'
            }}>
              {item.title}
            </Text>
            <Text color="secondary" style={{ 
              fontSize: 13, 
              color: '#6b7280',
              lineHeight: 18
            }}>
              {item.description}
            </Text>
          </View>

          {/* Arrow */}
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color="#9ca3af"
          />
        </View>
      </Card>
    </TouchableOpacity>
  );

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
            Settings
          </Text>
          <Text color="secondary" style={{ 
            marginTop: 4, 
            fontSize: 14,
            color: '#71717a'
          }}>
            Configure your business settings
          </Text>
        </View>

        {/* Settings List */}
        <View style={{ padding: 16, paddingTop: 8 }}>
          {SETTINGS_ITEMS.map(renderSettingsItem)}
        </View>

        {/* Info Card */}
        <View style={{ padding: 16, paddingTop: 0 }}>
          <Card variant="outlined" padding="md">
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <MaterialCommunityIcons
                name="information"
                size={20}
                color="#18181b"
                style={{ marginRight: 12, marginTop: 2 }}
              />
              <View style={{ flex: 1 }}>
                <Text variant="h6" color="primary" style={{ 
                  fontSize: 14, 
                  fontWeight: '600', 
                  marginBottom: 4,
                  color: '#18181b'
                }}>
                  Configuration Help
                </Text>
                <Text color="secondary" style={{ 
                  fontSize: 12, 
                  color: '#71717a',
                  lineHeight: 16
                }}>
                  Each setting section allows you to configure specific aspects of your business. 
                  Changes are saved automatically and take effect immediately.
                </Text>
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>
    </Surface>
  );
};
