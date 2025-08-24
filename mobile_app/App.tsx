import React from 'react';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  return (
    <>
      <StatusBar style="auto" />
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </>
  );
}
