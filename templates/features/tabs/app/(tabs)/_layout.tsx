import { Tabs } from 'expo-router';
import React from 'react';
import { useAuth } from '../../src/hooks';

export default function TabLayout() {
  const { isAuthenticated } = useAuth();

  // This layout should only render if user is authenticated
  // The root layout handles the redirect
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E5EA',
        },
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerTintColor: '#000000',
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerTitle: 'Home',
        }}
      />
    </Tabs>
  );
}