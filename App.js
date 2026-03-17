import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, Platform } from 'react-native';
import WeekScreen from './src/screens/WeekScreen';
import HistoryScreen from './src/screens/HistoryScreen';

const Tab = createBottomTabNavigator();

function TabIcon({ focused, label }) {
  const icons = { Week: '📅', History: '📊' };
  return (
    <Text style={{ fontSize: focused ? 20 : 18, opacity: focused ? 1 : 0.5 }}>
      {icons[label]}
    </Text>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#0f0f0f',
            borderTopColor: '#1e1e1e',
            borderTopWidth: 1,
            paddingBottom: Platform.OS === 'android' ? 8 : 0,
            height: Platform.OS === 'android' ? 58 : 80,
          },
          tabBarActiveTintColor: '#00e676',
          tabBarInactiveTintColor: '#555',
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label={route.name} />
          ),
        })}
      >
        <Tab.Screen name="Week" component={WeekScreen} />
        <Tab.Screen name="History" component={HistoryScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
