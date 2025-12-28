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
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
    </Tabs>
  );
}
