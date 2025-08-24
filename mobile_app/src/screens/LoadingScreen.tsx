import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

const LoadingScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <FontAwesome5 name="spinner" size={32} color="#007AFF" />
      <Text style={styles.text}>Loading...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    gap: 16,
  },
  text: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
});

export default LoadingScreen;
