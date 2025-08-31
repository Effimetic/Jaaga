import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Surface, Text } from '../components/catalyst';

export const PublicSearchScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  return (
    <Surface variant="default" style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <MaterialCommunityIcons name="account" size={48} color="#d1d5db" />
      <Text style={{ fontSize: 16, color: '#6b7280', marginTop: 16, textAlign: 'center' }}>
        Public Search Screen
      </Text>
      <Text style={{ fontSize: 14, color: '#9ca3af', marginTop: 8, textAlign: 'center' }}>
        This will allow public users to search and book trips
      </Text>
    </Surface>
  );
};
